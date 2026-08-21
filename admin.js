// ============================================
// Cure Diet - Admin JavaScript (مع وجبات متعددة)
// ============================================

console.log('🚀 admin.js started');

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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== المتغيرات العامة =====
let currentMenuId = null;
let currentMenuName = '';

// ============================================================
// ===== الصفحة 1: قائمة المنيوات =====
// ============================================================

async function loadMenus() {
    console.log('📡 Loading menus...');
    const container = document.getElementById('menusList');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">جاري التحميل...</p></div>';
    
    try {
        const snapshot = await db.collection('menus').get();
        const menus = [];
        snapshot.forEach(doc => {
            menus.push({ id: doc.id, ...doc.data() });
        });
        
        document.getElementById('menusCount').textContent = menus.length;
        
        if (menus.length === 0) {
            container.innerHTML = '<div class="text-center py-5"><p class="text-muted">📋 لا توجد منيوات</p></div>';
            return;
        }
        
        let html = '';
        menus.forEach(menu => {
            html += `
                <div class="menu-item" style="border:1px solid #e9ecef;border-radius:12px;padding:16px 20px;margin-bottom:16px;background:#fff;cursor:pointer;" onclick="openMenuDetails('${menu.id}', '${menu.name}')">
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div class="d-flex align-items-center gap-2">
                            <span style="font-size:1.8rem;">${menu.icon || '📋'}</span>
                            <span style="font-weight:600;font-size:1.1rem;">${menu.name}</span>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteMenu('${menu.id}')">🗑 حذف</button>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        console.log('✅ Menus loaded');
        
    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = `<div class="text-center py-5"><p class="text-danger">⚠️ خطأ: ${error.message}</p><button class="btn btn-primary btn-sm" onclick="loadMenus()">🔄 إعادة</button></div>`;
    }
}

// ============================================================
// ===== فتح تفاصيل المنيو =====
// ============================================================

async function openMenuDetails(menuId, menuName) {
    console.log('📂 Opening menu:', menuId, menuName);
    currentMenuId = menuId;
    currentMenuName = menuName;
    
    try {
        document.getElementById('stepMenus').style.display = 'none';
        document.getElementById('stepMenuDetails').style.display = 'block';
        document.getElementById('btnBack').style.display = 'inline-block';
        document.getElementById('breadcrumbTitle').textContent = '📋 ' + menuName;
        document.getElementById('menuDetailsTitle').textContent = '📋 ' + menuName + ' - الأيام والوجبات';
        
        await loadMenuDetails(menuId);
    } catch (error) {
        console.error('❌ Error opening menu:', error);
        alert('❌ خطأ في فتح المنيو: ' + error.message);
    }
}

function goBack() {
    document.getElementById('stepMenuDetails').style.display = 'none';
    document.getElementById('stepMenus').style.display = 'block';
    document.getElementById('btnBack').style.display = 'none';
    document.getElementById('breadcrumbTitle').textContent = 'لوحة التحكم';
    loadMenus();
}

// ============================================================
// ===== تحميل تفاصيل المنيو =====
// ============================================================

async function loadMenuDetails(menuId) {
    console.log('📡 Loading menu details for:', menuId);
    const container = document.getElementById('menuDetailsContent');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">جاري التحميل...</p></div>';
    
    try {
        const daysSnapshot = await db.collection('days').where('menu_id', '==', menuId).get();
        const days = [];
        daysSnapshot.forEach(doc => {
            days.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('📊 Days found:', days.length);
        
        if (days.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <p class="text-muted">📅 لا توجد أيام</p>
                    <button class="btn btn-success btn-sm" onclick="addDay()">+ إضافة يوم</button>
                </div>
            `;
            return;
        }
        
        let html = '';
        for (const day of days) {
            const mealsSnapshot = await db.collection('meals').where('day_id', '==', day.id).get();
            const meals = [];
            mealsSnapshot.forEach(doc => {
                meals.push({ id: doc.id, ...doc.data() });
            });
            
            const labels = {
                breakfast: '🍳 فطار',
                lunch: '🍗 غداء',
                dinner: '🌙 عشاء',
                snack: '🍰 سناك',
                salad: '🥗 سلطة'
            };
            
            // تجميع الوجبات حسب النوع
            const grouped = {};
            meals.forEach(meal => {
                if (!grouped[meal.meal_type]) grouped[meal.meal_type] = [];
                grouped[meal.meal_type].push(meal);
            });
            
            html += `
                <div style="border:1px solid #e9ecef;border-radius:10px;padding:10px 15px;margin:8px 0;background:#f8f9fa;">
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <span style="font-weight:600;">📅 ${day.day_name}</span>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-primary" onclick="addMeal('${day.id}')">+ إضافة وجبة</button>
                            <button class="btn btn-sm btn-success" onclick="addMultipleMeals('${day.id}')">+ إضافة متعدد</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteDay('${day.id}')">🗑</button>
                        </div>
                    </div>
                    <div style="padding-right:20px;border-right:2px solid #28a745;margin:8px 0 0;">
                        ${Object.keys(grouped).length === 0 ? '<p style="font-size:12px;color:#6c757d;margin:4px 0;">لا توجد وجبات</p>' : ''}
                        ${Object.keys(grouped).map(type => `
                            <div style="margin:4px 0;">
                                <span style="font-weight:500;font-size:13px;color:#2c3e50;">${labels[type] || type}:</span>
                                ${grouped[type].map(meal => `
                                    <span style="border:1px solid #e9ecef;border-radius:8px;padding:4px 12px;margin:3px 4px;background:#fff;display:inline-flex;align-items:center;gap:6px;font-size:13px;">
                                        ${meal.option_name}
                                        <button style="border:none;background:transparent;color:#dc3545;cursor:pointer;font-size:14px;" onclick="deleteMeal('${meal.id}')">✕</button>
                                    </span>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
        console.log('✅ Menu details loaded');
        
    } catch (error) {
        console.error('❌ Error loading details:', error);
        container.innerHTML = `<div class="text-center py-5"><p class="text-danger">⚠️ خطأ: ${error.message}</p></div>`;
    }
}

// ============================================================
// ===== إضافة وجبة واحدة =====
// ============================================================

async function addMeal(dayId) {
    const labels = {
        breakfast: '🍳 الفطور',
        lunch: '🍗 الغداء',
        dinner: '🌙 العشاء',
        snack: '🍰 السناك',
        salad: '🥗 السلطة'
    };
    const types = ['breakfast', 'lunch', 'dinner', 'snack', 'salad'];
    
    const choice = prompt(
        'اختر نوع الوجبة:\n' +
        '1. ' + labels.breakfast + '\n' +
        '2. ' + labels.lunch + '\n' +
        '3. ' + labels.dinner + '\n' +
        '4. ' + labels.snack + '\n' +
        '5. ' + labels.salad
    );
    if (!choice) return;
    
    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= types.length) {
        alert('❌ اختيار غير صحيح');
        return;
    }
    
    const mealType = types[index];
    const optionName = prompt('🍽️ أدخل اسم الصنف (' + labels[mealType] + '):');
    if (!optionName || !optionName.trim()) return;
    
    try {
        await db.collection('meals').add({
            day_id: dayId,
            meal_type: mealType,
            option_name: optionName.trim(),
            createdAt: new Date()
        });
        alert('✅ تم إضافة الصنف');
        loadMenuDetails(currentMenuId);
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ خطأ: ' + error.message);
    }
}

// ============================================================
// ===== إضافة وجبات متعددة (سريعة) =====
// ============================================================

async function addMultipleMeals(dayId) {
    const labels = {
        breakfast: '🍳 الفطور',
        lunch: '🍗 الغداء',
        dinner: '🌙 العشاء',
        snack: '🍰 السناك',
        salad: '🥗 السلطة'
    };
    const types = ['breakfast', 'lunch', 'dinner', 'snack', 'salad'];
    
    // اختيار النوع
    const choice = prompt(
        'اختر نوع الوجبة:\n' +
        '1. ' + labels.breakfast + '\n' +
        '2. ' + labels.lunch + '\n' +
        '3. ' + labels.dinner + '\n' +
        '4. ' + labels.snack + '\n' +
        '5. ' + labels.salad
    );
    if (!choice) return;
    
    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= types.length) {
        alert('❌ اختيار غير صحيح');
        return;
    }
    
    const mealType = types[index];
    
    // إضافة أسماء متعددة (مفصولة بفاصلة)
    const namesInput = prompt('🍽️ أدخل أسماء الأصناف (مفصولة بفاصلة ,):\nمثال: ساندوتش حلوم, بيض مقلي, راب ديك رومي');
    if (!namesInput || !namesInput.trim()) return;
    
    const names = namesInput.split(',').map(n => n.trim()).filter(n => n.length > 0);
    
    if (names.length === 0) {
        alert('❌ لم تدخل أي أسماء صحيحة');
        return;
    }
    
    try {
        let count = 0;
        for (const name of names) {
            await db.collection('meals').add({
                day_id: dayId,
                meal_type: mealType,
                option_name: name,
                createdAt: new Date()
            });
            count++;
        }
        alert('✅ تم إضافة ' + count + ' وجبات بنجاح');
        loadMenuDetails(currentMenuId);
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ خطأ: ' + error.message);
    }
}

// ============================================================
// ===== دوال الإضافة والحذف =====
// ============================================================

async function addMenu() {
    const nameInput = document.getElementById('newMenuName');
    const iconInput = document.getElementById('newMenuIcon');
    const name = nameInput.value.trim();
    const icon = iconInput.value.trim() || '📋';
    
    if (!name) {
        alert('⚠️ يرجى كتابة اسم المنيو');
        nameInput.focus();
        return;
    }
    
    try {
        await db.collection('menus').add({
            name: name,
            icon: icon,
            active: true,
            createdAt: new Date()
        });
        nameInput.value = '';
        iconInput.value = '';
        alert('✅ تم إضافة المنيو بنجاح');
        loadMenus();
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ خطأ: ' + error.message);
    }
}

async function deleteMenu(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا المنيو؟')) return;
    
    try {
        const daysSnapshot = await db.collection('days').where('menu_id', '==', id).get();
        for (const doc of daysSnapshot.docs) {
            const mealsSnapshot = await db.collection('meals').where('day_id', '==', doc.id).get();
            for (const mealDoc of mealsSnapshot.docs) {
                await db.collection('meals').doc(mealDoc.id).delete();
            }
            await db.collection('days').doc(doc.id).delete();
        }
        await db.collection('menus').doc(id).delete();
        alert('✅ تم الحذف بنجاح');
        loadMenus();
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ خطأ: ' + error.message);
    }
}

async function addDay() {
    const dayName = prompt('📅 أدخل اسم اليوم:');
    if (!dayName || !dayName.trim()) return;
    
    try {
        await db.collection('days').add({
            menu_id: currentMenuId,
            day_name: dayName.trim(),
            order_index: 1,
            createdAt: new Date()
        });
        alert('✅ تم إضافة اليوم');
        loadMenuDetails(currentMenuId);
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ خطأ: ' + error.message);
    }
}

async function deleteDay(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا اليوم؟')) return;
    
    try {
        const mealsSnapshot = await db.collection('meals').where('day_id', '==', id).get();
        for (const doc of mealsSnapshot.docs) {
            await db.collection('meals').doc(doc.id).delete();
        }
        await db.collection('days').doc(id).delete();
        alert('✅ تم الحذف');
        loadMenuDetails(currentMenuId);
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ خطأ: ' + error.message);
    }
}

async function deleteMeal(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الصنف؟')) return;
    
    try {
        await db.collection('meals').doc(id).delete();
        alert('✅ تم الحذف');
        loadMenuDetails(currentMenuId);
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ خطأ: ' + error.message);
    }
}

// ============================================================
// ===== التشغيل =====
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM loaded');
    loadMenus();
});

// ===== جعل الدوال متاحة عالمياً =====
window.addMenu = addMenu;
window.deleteMenu = deleteMenu;
window.addDay = addDay;
window.deleteDay = deleteDay;
window.addMeal = addMeal;
window.addMultipleMeals = addMultipleMeals;
window.deleteMeal = deleteMeal;
window.loadMenus = loadMenus;
window.openMenuDetails = openMenuDetails;
window.goBack = goBack;
window.loadMenuDetails = loadMenuDetails;

console.log('✅ admin.js loaded');