// ============================================
// Cure Diet - Reports JavaScript (معدل - أسابيع A,B,C,D)
// ============================================

// ===== Firebase Configuration =====
const firebaseConfig = {
    apiKey: "AIzaSyC4RGoo0fCWYgliOiC2NR5-hKmUaUhjPWI",
    authDomain: "menu-cdd1d.firebaseapp.com",
    projectId: "menu-cdd1d",
    storageBucket: "menu-cdd1d.firebasestorage.app",
    messagingSenderId: "901844363431",
    appId: "1:901844363431:web:4cec46b053a0a7f878d382",
    measurementId: "G-569LE65Q2Z"
};

// ===== Initialize Firebase =====
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================================
// ===== المتغيرات العامة =====
// ============================================================

let allOrders = [];
let filteredOrders = [];
let selectedOrders = new Set();
let currentWeek = 'all';
let menusList = [];
let allWeeksList = [];

// ============================================================
// ===== حساب الأسبوع من التاريخ (يعتمد على السبت) =====
// ============================================================

function getWeekNumberFromDate(dateStr) {
    if (!dateStr) return 0;
    
    let date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        // محاولة تحويل التاريخ بصيغة DD/MM/YYYY
        const parts = dateStr.match(/(\d+)\/(\d+)\/(\d+)/);
        if (parts) {
            date = new Date(parts[3], parts[2] - 1, parts[1]);
        }
    }
    
    if (isNaN(date.getTime())) return 0;
    
    // حساب الأسبوع بناءً على السبت
    const saturday = getCurrentWeekSaturday();
    const diffDays = Math.floor((date - saturday) / (24 * 60 * 60 * 1000));
    const weekOffset = Math.floor(diffDays / 7);
    
    // الأسبوع الحالي = 0، القادم = 1، إلخ
    // نرجع رقم الأسبوع من 1-4
    if (weekOffset >= 0 && weekOffset < 4) {
        return weekOffset + 1;
    }
    
    return 0;
}

function getCurrentWeekSaturday() {
    const today = new Date();
    const currentDay = today.getDay();
    
    const saturday = new Date(today);
    
    if (currentDay === 6) {
        saturday.setHours(0, 0, 0, 0);
        return saturday;
    }
    
    const daysToSaturday = currentDay + 1;
    saturday.setDate(today.getDate() - daysToSaturday);
    saturday.setHours(0, 0, 0, 0);
    
    return saturday;
}

function getWeekLabel(weekNum) {
    if (weekNum === 0) return '-';
    const weekLetters = ['A', 'B', 'C', 'D'];
    const index = (weekNum - 1) % 4;
    return 'الأسبوع ' + weekLetters[index];
}

function getWeekLetter(weekNum) {
    if (weekNum === 0) return '-';
    const weekLetters = ['A', 'B', 'C', 'D'];
    const index = (weekNum - 1) % 4;
    return weekLetters[index];
}

// ============================================================
// ===== جلب الأسابيع من Firebase =====
// ============================================================

async function loadWeeksList() {
    try {
        const snapshot = await db.collection('weeks')
            .where('active', '==', true)
            .orderBy('week_number', 'asc')
            .get();
        
        allWeeksList = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allWeeksList.push({
                id: doc.id,
                week_number: data.week_number,
                week_name: data.week_name,
                start_date: data.start_date,
                end_date: data.end_date,
                is_current: data.is_current || false
            });
        });
        
        // تحديث فلتر الأسابيع
        populateWeekFilter();
        
        console.log('✅ Weeks loaded:', allWeeksList.length);
        return allWeeksList;
    } catch (error) {
        console.error('❌ Error loading weeks:', error);
        return [];
    }
}

// ============================================================
// ===== populate Week Filter =====
// ============================================================

function populateWeekFilter() {
    const container = document.getElementById('weekFilterButtons');
    if (!container) return;
    
    // حفظ الأسبوع المحدد حالياً
    const currentWeekValue = currentWeek;
    
    container.innerHTML = `
        <button class="btn-week active" data-week="all" onclick="setWeek('all')">
            📅 الكل
        </button>
    `;
    
    allWeeksList.forEach(week => {
        const isActive = currentWeekValue === week.week_number.toString() ? 'active' : '';
        const currentBadge = week.is_current ? '📍' : '';
        container.innerHTML += `
            <button class="btn-week ${isActive}" data-week="${week.week_number}" onclick="setWeek('${week.week_number}')">
                ${currentBadge} ${week.week_name}
                <span style="font-size:10px;display:block;color:#6c757d;">${week.start_date} → ${week.end_date}</span>
            </button>
        `;
    });
}

// ============================================================
// ===== جلب البيانات من Firebase =====
// ============================================================

async function loadReports() {
    console.log('📡 Loading reports...');
    const tbody = document.getElementById('ordersTable');
    tbody.innerHTML = `
        <tr>
            <td colspan="15" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2">جاري تحميل الطلبات...</p>
            </td>
        </tr>
    `;
    
    try {
        // جلب المنيوات للفلترة
        const menusSnapshot = await db.collection('menus').get();
        menusList = [];
        menusSnapshot.forEach(doc => {
            menusList.push({ id: doc.id, name: doc.data().name });
        });
        populateMenuFilter();
        
        // جلب الأسابيع
        await loadWeeksList();
        
        // جلب الطلبات
        const ordersSnapshot = await db.collection('orders')
            .orderBy('timestamp', 'desc')
            .get();
        
        allOrders = [];
        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            // محاولة استخراج رقم الأسبوع من البيانات
            let weekNum = 0;
            let weekName = data.week || '';
            
            // إذا كان الأسبوع مخزناً كاسم (مثل "الأسبوع A")، نحاول استخراج الرقم
            if (weekName && weekName.includes('الأسبوع ')) {
                const letter = weekName.replace('الأسبوع ', '').trim();
                const weekLetters = ['A', 'B', 'C', 'D'];
                const index = weekLetters.indexOf(letter);
                if (index !== -1) {
                    weekNum = index + 1;
                }
            }
            
            // إذا لم نجد رقم الأسبوع، نحسبه من التاريخ
            if (weekNum === 0) {
                weekNum = getWeekNumberFromDate(data.timestamp || data.createdAt || data.order_date);
            }
            
            allOrders.push({
                id: doc.id,
                ...data,
                week_number: weekNum,
                weekLabel: weekName || getWeekLabel(weekNum),
                weekLetter: getWeekLetter(weekNum),
                weekRange: data.week_range || '-'
            });
        });
        
        console.log('📊 Orders loaded:', allOrders.length);
        selectedOrders.clear();
        applyFilters();
        
    } catch (error) {
        console.error('❌ Error loading reports:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="15" class="text-center py-5 text-danger">
                    ⚠️ خطأ في تحميل البيانات: ${error.message}
                    <br>
                    <button class="btn btn-primary btn-sm mt-2" onclick="loadReports()">🔄 إعادة المحاولة</button>
                </td>
            </tr>
        `;
    }
}

// ============================================================
// ===== populate Menu Filter =====
// ============================================================

function populateMenuFilter() {
    const select = document.getElementById('filterMenu');
    if (!select) return;
    select.innerHTML = '<option value="">كل المنيوات</option>';
    menusList.forEach(menu => {
        select.innerHTML += `<option value="${menu.name}">${menu.name}</option>`;
    });
}

// ============================================================
// ===== apply Filters =====
// ============================================================

function applyFilters() {
    const searchName = document.getElementById('searchName').value.toLowerCase().trim();
    const filterMenu = document.getElementById('filterMenu').value;
    const filterStatus = document.getElementById('filterStatus').value;
    
    filteredOrders = allOrders.filter(order => {
        if (searchName && !(order.customer_name || '').toLowerCase().includes(searchName)) {
            return false;
        }
        if (filterMenu && order.menu !== filterMenu) {
            return false;
        }
        if (filterStatus && order.status !== filterStatus) {
            return false;
        }
        if (currentWeek !== 'all') {
            const weekNum = parseInt(currentWeek);
            if (order.week_number !== weekNum) {
                return false;
            }
        }
        return true;
    });
    
    renderTable();
    updateStats();
}

// ============================================================
// ===== set Week =====
// ============================================================

function setWeek(week) {
    currentWeek = week;
    document.querySelectorAll('#weekFilterButtons .btn-week').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.week === week);
    });
    applyFilters();
}

// ============================================================
// ===== render Table =====
// ============================================================

function renderTable() {
    const tbody = document.getElementById('ordersTable');
    document.getElementById('ordersCount').textContent = filteredOrders.length + ' طلب';
    document.getElementById('selectedCount').textContent = selectedOrders.size + ' محدد';
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="15" class="text-center py-5 text-muted">
                    📭 لا توجد طلبات تطابق معايير البحث
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    filteredOrders.forEach((order, index) => {
        const isChecked = selectedOrders.has(order.id) ? 'checked' : '';
        
        // عرض الأسبوع ونطاق الأسبوع
        const weekDisplay = order.weekLabel || 'غير محدد';
        const weekRangeDisplay = order.week_range || '-';
        
        // تحديد لون الأسبوع حسب الحرف
        let weekColor = '';
        if (order.weekLetter === 'A') weekColor = '#ff6b6b';
        else if (order.weekLetter === 'B') weekColor = '#4ecdc4';
        else if (order.weekLetter === 'C') weekColor = '#45b7d1';
        else if (order.weekLetter === 'D') weekColor = '#96ceb4';
        
        html += `
            <tr>
                <td>
                    <input type="checkbox" class="order-checkbox" data-id="${order.id}" ${isChecked} onchange="toggleOrder('${order.id}')">
                </td>
                <td>${index + 1}</td>
                <td>${order.timestamp || order.createdAt || order.order_date || '-'}</td>
                <td><strong>${order.menu || '-'}</strong></td>
                <td>${order.day || '-'}</td>
                <td><strong>${order.customer_name || '-'}</strong></td>
                <td>${order.breakfast || '-'}</td>
                <td>${order.lunch || '-'}</td>
                <td>${order.dinner || '-'}</td>
                <td>${order.snack || '-'}</td>
                <td>${order.salad || '-'}</td>
                <td>
                    <span class="week-badge" style="background:${weekColor};color:white;padding:3px 10px;border-radius:12px;font-size:12px;">
                        ${weekDisplay}
                    </span>
                </td>
                <td style="font-size:11px;color:#6c757d;">${weekRangeDisplay}</td>
                <td>
                    <select class="form-select form-select-sm" style="width:100px;font-size:12px;" onchange="updateStatus('${order.id}', this.value)">
                        <option value="جديد" ${order.status === 'جديد' ? 'selected' : ''}>جديد</option>
                        <option value="مكتمل" ${order.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                        <option value="ملغي" ${order.status === 'ملغي' ? 'selected' : ''}>ملغي</option>
                    </select>
                </td>
                <td>
                    <button class="delete-btn" onclick="deleteSingleOrder('${order.id}')" title="حذف">🗑</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ============================================================
// ===== update Stats =====
// ============================================================

function updateStats() {
    document.getElementById('totalOrders').textContent = allOrders.length;
    
    const uniqueCustomers = new Set(allOrders.map(o => o.customer_name).filter(Boolean));
    document.getElementById('totalCustomers').textContent = uniqueCustomers.size;
    
    const uniqueMenus = new Set(allOrders.map(o => o.menu).filter(Boolean));
    document.getElementById('totalMenus').textContent = uniqueMenus.size;
    
    // عدد طلبات الأسبوع الحالي
    const currentWeekOrders = allOrders.filter(o => {
        return allWeeksList.some(w => w.is_current && o.week_number === w.week_number);
    });
    document.getElementById('weekOrders').textContent = currentWeekOrders.length;
    
    const newOrders = allOrders.filter(o => o.status === 'جديد');
    document.getElementById('newOrders').textContent = newOrders.length;
    
    const completedOrders = allOrders.filter(o => o.status === 'مكتمل');
    document.getElementById('completedOrders').textContent = completedOrders.length;
}

// ============================================================
// ===== دوال التحديد =====
// ============================================================

function toggleOrder(id) {
    if (selectedOrders.has(id)) {
        selectedOrders.delete(id);
    } else {
        selectedOrders.add(id);
    }
    document.getElementById('selectedCount').textContent = selectedOrders.size + ' محدد';
}

function toggleSelectAll() {
    const checked = document.getElementById('selectAllCheckbox').checked;
    if (checked) {
        filteredOrders.forEach(order => selectedOrders.add(order.id));
    } else {
        selectedOrders.clear();
    }
    renderTable();
}

// ============================================================
// ===== دوال الحذف =====
// ============================================================

async function deleteSingleOrder(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الطلب؟')) return;
    
    try {
        await db.collection('orders').doc(id).delete();
        showToast('✅ تم حذف الطلب بنجاح', 'success');
        loadReports();
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('❌ خطأ في الحذف: ' + error.message, 'error');
    }
}

async function deleteSelectedOrders() {
    if (selectedOrders.size === 0) {
        showToast('⚠️ لم تختار أي طلبات للحذف', 'warning');
        return;
    }
    
    if (!confirm(`⚠️ هل أنت متأكد من حذف ${selectedOrders.size} طلب/طلبات؟`)) return;
    
    try {
        let count = 0;
        for (const id of selectedOrders) {
            await db.collection('orders').doc(id).delete();
            count++;
        }
        selectedOrders.clear();
        showToast(`✅ تم حذف ${count} طلب بنجاح`, 'success');
        loadReports();
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('❌ خطأ في الحذف: ' + error.message, 'error');
    }
}

async function deleteFilteredOrders() {
    if (filteredOrders.length === 0) {
        showToast('⚠️ لا توجد طلبات مظهرة للحذف', 'warning');
        return;
    }
    
    if (!confirm(`⚠️ هل أنت متأكد من حذف ${filteredOrders.length} طلب/طلبات (المظهرة)؟`)) return;
    
    try {
        let count = 0;
        for (const order of filteredOrders) {
            await db.collection('orders').doc(order.id).delete();
            count++;
        }
        selectedOrders.clear();
        showToast(`✅ تم حذف ${count} طلب بنجاح`, 'success');
        loadReports();
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('❌ خطأ في الحذف: ' + error.message, 'error');
    }
}

async function deleteAllOrders() {
    if (allOrders.length === 0) {
        showToast('⚠️ لا توجد طلبات للحذف', 'warning');
        return;
    }
    
    if (!confirm(`⚠️ هل أنت متأكد من حذف ${allOrders.length} طلب/طلبات (جميع الطلبات)؟`)) return;
    
    try {
        let count = 0;
        for (const order of allOrders) {
            await db.collection('orders').doc(order.id).delete();
            count++;
        }
        selectedOrders.clear();
        showToast(`✅ تم حذف ${count} طلب بنجاح`, 'success');
        loadReports();
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('❌ خطأ في الحذف: ' + error.message, 'error');
    }
}

// ============================================================
// ===== تحديث حالة الطلب =====
// ============================================================

async function updateStatus(id, status) {
    try {
        await db.collection('orders').doc(id).update({ status: status });
        showToast('✅ تم تحديث الحالة', 'success');
        loadReports();
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('❌ خطأ في التحديث: ' + error.message, 'error');
    }
}

// ============================================================
// ===== Export CSV =====
// ============================================================

function exportCSV() {
    if (filteredOrders.length === 0) {
        showToast('⚠️ لا توجد بيانات لتصديرها', 'warning');
        return;
    }
    
    const headers = ['التاريخ', 'المنيو', 'اليوم', 'العميل', 'الفطور', 'الغداء', 'العشاء', 'السناك', 'السلطة', 'الأسبوع', 'نطاق الأسبوع', 'الحالة'];
    const rows = filteredOrders.map(order => [
        order.timestamp || order.createdAt || order.order_date || '',
        order.menu || '',
        order.day || '',
        order.customer_name || '',
        order.breakfast || '',
        order.lunch || '',
        order.dinner || '',
        order.snack || '',
        order.salad || '',
        order.weekLabel || '',
        order.week_range || '',
        order.status || 'جديد'
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `طلبات_كيور_دايت_${new Date().toLocaleDateString()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    showToast('📥 تم تصدير البيانات بنجاح', 'success');
}

// ============================================================
// ===== Toast Messages =====
// ============================================================

function showToast(text, type = 'success') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast-custom ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || '📌'}</span><span>${text}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ============================================================
// ===== إعادة تحميل الأسابيع (للتحديث اليدوي) =====
// ============================================================

async function refreshWeeks() {
    showToast('🔄 جاري تحديث الأسابيع...', 'warning');
    await loadWeeksList();
    applyFilters();
    showToast('✅ تم تحديث الأسابيع', 'success');
}

// ============================================================
// ===== التشغيل عند التحميل =====
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ reports.js loaded');
    loadReports();
});

// ===== جعل الدوال متاحة عالمياً =====
window.loadReports = loadReports;
window.applyFilters = applyFilters;
window.setWeek = setWeek;
window.exportCSV = exportCSV;
window.deleteSingleOrder = deleteSingleOrder;
window.deleteSelectedOrders = deleteSelectedOrders;
window.deleteFilteredOrders = deleteFilteredOrders;
window.deleteAllOrders = deleteAllOrders;
window.toggleOrder = toggleOrder;
window.toggleSelectAll = toggleSelectAll;
window.updateStatus = updateStatus;
window.refreshWeeks = refreshWeeks;
