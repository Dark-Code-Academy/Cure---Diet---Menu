// ============================================
// Cure Diet - main.js (كامل)
// ============================================

console.log('✅ main.js loaded!');

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

console.log('✅ Firebase initialized');

// ============================================================
// ===== Constants =====
// ============================================================

const PHONE_NUMBER = '96566473580';
const DAYS_AR = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const MEAL_TYPES = [
    { id: 'breakfast', label: 'الفطور', icon: '🍳' },
    { id: 'lunch', label: 'الغداء', icon: '🍗' },
    { id: 'dinner', label: 'العشاء', icon: '🌙' },
    { id: 'snack', label: 'السناك', icon: '🍰' },
    { id: 'salad', label: 'السلطة', icon: '🥗' }
];

// ============================================================
// ===== Global Variables =====
// ============================================================

let menus = [];
let days = [];
let meals = [];
let allWeeks = [];
let currentMenuId = null;
let currentDayId = null;
let selectedMeals = {};
let selectedWeek = null;
let selectedWeekDates = [];

// ============================================================
// ===== حساب التواريخ ديناميكياً =====
// ============================================================

function getWeekDates(weekNumber) {
    const today = new Date();
    const currentDay = today.getDay();
    
    let saturday = new Date(today);
    const daysToSaturday = (currentDay + 1) % 7;
    saturday.setDate(today.getDate() - daysToSaturday);
    
    const weekOffset = (weekNumber - 1) * 7;
    saturday.setDate(saturday.getDate() + weekOffset);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(saturday);
        date.setDate(saturday.getDate() + i);
        weekDates.push(date);
    }
    return weekDates;
}

function formatDateFull(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return d + '/' + m + '/' + y;
}

function getWeekRange(weekNumber) {
    const dates = getWeekDates(weekNumber);
    return 'من ' + formatDateFull(dates[0]) + ' إلى ' + formatDateFull(dates[6]);
}

// ============================================================
// ===== تحديث الأسابيع تلقائياً =====
// ============================================================

async function updateWeeksAutomatically(menuId) {
    console.log('🔄 تحديث الأسابيع تلقائياً للمنيو:', menuId);
    try {
        const existing = await db.collection('weeks')
            .where('menu_id', '==', menuId)
            .get();
        
        for (const doc of existing.docs) {
            await db.collection('weeks').doc(doc.id).delete();
        }
        console.log('✅ تم حذف الأسابيع القديمة');
        
        const weeks = [];
        for (let i = 1; i <= 4; i++) {
            const dates = getWeekDates(i);
            weeks.push({
                menu_id: menuId,
                week_number: i,
                week_name: i === 1 ? 'الأسبوع الأول' : i === 2 ? 'الأسبوع الثاني' : i === 3 ? 'الأسبوع الثالث' : 'الأسبوع الرابع',
                start_date: formatDateFull(dates[0]),
                end_date: formatDateFull(dates[6]),
                active: true,
                updatedAt: new Date()
            });
        }
        
        for (const week of weeks) {
            await db.collection('weeks').add(week);
        }
        console.log('✅ تم إضافة الأسابيع الجديدة');
        return weeks;
        
    } catch (error) {
        console.error('❌ خطأ في تحديث الأسابيع:', error);
        return [];
    }
}

// ============================================================
// ===== Load Data from Firebase =====
// ============================================================

async function loadMenus() {
    console.log('📡 Loading menus...');
    try {
        const snapshot = await db.collection('menus').get();
        menus = [];
        snapshot.forEach(function(doc) {
            menus.push({ id: doc.id, name: doc.data().name, icon: doc.data().icon });
        });
        console.log('✅ Menus loaded:', menus.length);
        return menus;
    } catch (error) {
        console.error('❌ Error loading menus:', error);
        return [];
    }
}

async function loadDays(menuId) {
    console.log('📡 Loading days for menu:', menuId);
    try {
        const snapshot = await db.collection('days')
            .where('menu_id', '==', menuId)
            .get();
        days = [];
        snapshot.forEach(function(doc) {
            days.push({ id: doc.id, day_name: doc.data().day_name });
        });
        console.log('✅ Days loaded:', days.length);
        return days;
    } catch (error) {
        console.error('❌ Error loading days:', error);
        return [];
    }
}

async function loadMeals(dayId) {
    console.log('📡 Loading meals for day:', dayId);
    try {
        const snapshot = await db.collection('meals')
            .where('day_id', '==', dayId)
            .get();
        meals = [];
        snapshot.forEach(function(doc) {
            meals.push({ id: doc.id, meal_type: doc.data().meal_type, option_name: doc.data().option_name });
        });
        console.log('✅ Meals loaded:', meals.length);
        return meals;
    } catch (error) {
        console.error('❌ Error loading meals:', error);
        return [];
    }
}

async function loadWeeks(menuId) {
    console.log('📡 Loading weeks for menu:', menuId);
    try {
        const snapshot = await db.collection('weeks')
            .where('menu_id', '==', menuId)
            .where('active', '==', true)
            .orderBy('week_number', 'asc')
            .get();
        allWeeks = [];
        snapshot.forEach(function(doc) {
            allWeeks.push({ id: doc.id, week_number: doc.data().week_number, week_name: doc.data().week_name, start_date: doc.data().start_date, end_date: doc.data().end_date });
        });
        
        if (allWeeks.length === 0) {
            console.log('⚠️ مفيش أسابيع، هنحسبها تلقائياً...');
            await updateWeeksAutomatically(menuId);
            const newSnapshot = await db.collection('weeks')
                .where('menu_id', '==', menuId)
                .where('active', '==', true)
                .orderBy('week_number', 'asc')
                .get();
            allWeeks = [];
            newSnapshot.forEach(function(doc) {
                allWeeks.push({ id: doc.id, week_number: doc.data().week_number, week_name: doc.data().week_name, start_date: doc.data().start_date, end_date: doc.data().end_date });
            });
        }
        
        console.log('✅ Weeks loaded:', allWeeks.length);
        return allWeeks;
    } catch (error) {
        console.error('❌ Error loading weeks:', error);
        return [];
    }
}

// ============================================================
// ===== Render Functions =====
// ============================================================

async function renderMenus() {
    console.log('🎨 Rendering menus...');
    var container = document.getElementById('menusContainer');
    if (!container) {
        console.error('❌ menusContainer not found');
        return;
    }
    
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">جاري تحميل المنيوات...</p></div>';
    
    await loadMenus();
    container.innerHTML = '';
    
    if (menus.length === 0) {
        container.innerHTML = '<div class="text-center py-5"><p class="text-muted">لا توجد منيوات حالياً</p><p class="text-muted small">⚠️ تأكد من إضافة منيو في Firebase</p></div>';
        return;
    }
    
    for (var m = 0; m < menus.length; m++) {
        var menu = menus[m];
        var col = document.createElement('div');
        col.className = 'col-6 col-md-3';
        col.innerHTML = '<div class="menu-btn" onclick="selectMenu(\'' + menu.id + '\')"><div class="icon">' + (menu.icon || '📋') + '</div><div class="name">' + menu.name + '</div></div>';
        container.appendChild(col);
    }
    
    document.getElementById('stepMenus').style.display = 'block';
    document.getElementById('stepWeek').style.display = 'none';
    document.getElementById('stepDays').style.display = 'none';
    document.getElementById('stepMeals').style.display = 'none';
    document.getElementById('breadcrumbTitle').textContent = 'اختر المنيو';
    document.getElementById('stepCounter').textContent = 'الخطوة 1 من 4';
    document.getElementById('btnBack').style.display = 'none';
    
    console.log('✅ Menus rendered');
}

async function renderWeeks(menuId) {
    console.log('🎨 Rendering weeks for menu:', menuId);
    var container = document.getElementById('weekOptions');
    if (!container) {
        console.error('❌ weekOptions not found');
        return;
    }
    
    container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">جاري تحميل الأسابيع...</p></div>';
    
    await loadWeeks(menuId);
    container.innerHTML = '';
    
    if (allWeeks.length === 0) {
        container.innerHTML = '<div class="text-center py-3"><p class="text-muted">لا توجد أسابيع متاحة</p><p class="text-muted small">⚠️ تأكد من إضافة أسابيع في Firebase</p></div>';
        return;
    }
    
    for (var w = 0; w < allWeeks.length; w++) {
        var week = allWeeks[w];
        var btn = document.createElement('div');
        btn.className = 'btn-week';
        btn.dataset.week = week.week_number;
        
        var today = new Date();
        var endParts = week.end_date.split('/');
        var endDate = new Date(endParts[2], endParts[1] - 1, endParts[0]);
        var isPast = endDate < today;
        
        btn.innerHTML = '<span class="week-label">📅 ' + week.week_name + '</span><span class="week-dates">' + week.start_date + ' → ' + week.end_date + '</span>' + (isPast ? '<span class="badge bg-secondary" style="font-size:10px;display:block;margin-top:4px;">✅ منتهي</span>' : '');
        
        btn.onclick = function(w) {
            return function() {
                if (isPast) {
                    alert('⚠️ هذا الأسبوع قد انتهى. يرجى اختيار أسبوع قادم.');
                    return;
                }
                document.querySelectorAll('.btn-week').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                selectedWeek = w;
                document.getElementById('weekRange').textContent = 'من ' + w.start_date + ' إلى ' + w.end_date;
                document.getElementById('weekBadge').textContent = w.week_name;
                document.getElementById('confirmWeekBtn').disabled = false;
            };
        }(week);
        container.appendChild(btn);
    }
    
    console.log('✅ Weeks rendered');
}

function confirmWeek() {
    console.log('✅ confirmWeek called');
    if (!selectedWeek) {
        alert('⚠️ يرجى اختيار أسبوع أولاً');
        return;
    }
    
    document.getElementById('stepWeek').style.display = 'none';
    document.getElementById('stepDays').style.display = 'block';
    document.getElementById('stepCounter').textContent = 'الخطوة 3 من 4';
    document.getElementById('breadcrumbTitle').textContent = 'اختر اليوم - ' + selectedWeek.week_name;
    document.getElementById('btnBack').style.display = 'inline-block';
    
    renderDays(currentMenuId);
}

async function renderDays(menuId) {
    console.log('🎨 Rendering days...');
    var container = document.getElementById('daysContainer');
    if (!container) {
        console.error('❌ daysContainer not found');
        return;
    }
    
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">جاري تحميل الأيام...</p></div>';
    
    await loadDays(menuId);
    container.innerHTML = '';
    
    if (days.length === 0) {
        container.innerHTML = '<div class="text-center py-5"><p class="text-muted">لا توجد أيام لهذا المنيو</p><p class="text-muted small">⚠️ تأكد من إضافة أيام في Firebase</p></div>';
        return;
    }
    
    var startParts = selectedWeek.start_date.split('/');
    var startDate = new Date(startParts[2], startParts[1] - 1, startParts[0]);
    
    for (var d = 0; d < days.length; d++) {
        var day = days[d];
        var currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + d);
        var dateStr = formatDateFull(currentDate);
        
        var col = document.createElement('div');
        col.className = 'col-4 col-md-2';
        col.innerHTML = '<div class="day-btn" onclick="selectDay(\'' + day.id + '\')"><span class="day-name">' + day.day_name + '</span><span class="day-date">' + dateStr + '</span></div>';
        container.appendChild(col);
    }
    
    document.getElementById('stepDays').style.display = 'block';
    document.getElementById('stepMeals').style.display = 'none';
    
    console.log('✅ Days rendered');
}

async function renderMeals(dayId) {
    console.log('🎨 Rendering meals for day:', dayId);
    var container = document.getElementById('mealsContainer');
    if (!container) {
        console.error('❌ mealsContainer not found');
        return;
    }
    
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">جاري تحميل الوجبات...</p></div>';
    
    await loadMeals(dayId);
    container.innerHTML = '';
    
    var dayName = '';
    for (var i = 0; i < days.length; i++) {
        if (days[i].id === dayId) {
            dayName = days[i].day_name;
            break;
        }
    }
    document.getElementById('selectedWeekDisplay').textContent = selectedWeek.week_name + ' - من ' + selectedWeek.start_date + ' إلى ' + selectedWeek.end_date;
    
    for (var mt = 0; mt < MEAL_TYPES.length; mt++) {
        var mealType = MEAL_TYPES[mt];
        var options = [];
        for (var ml = 0; ml < meals.length; ml++) {
            if (meals[ml].meal_type === mealType.id) {
                options.push(meals[ml].option_name);
            }
        }
        
        var col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4';
        var optionsHTML = '<option value="">-- اختر الصنف --</option>';
        for (var opt = 0; opt < options.length; opt++) {
            optionsHTML += '<option value="' + options[opt] + '">' + options[opt] + '</option>';
        }
        col.innerHTML = '<div class="meal-card"><div class="card-header"><span><span class="meal-icon">' + mealType.icon + '</span> ' + mealType.label + '</span><span class="meal-status" id="status-' + mealType.id + '">⏳ لم يتم</span></div><div class="card-body"><select class="form-select" id="select-' + mealType.id + '" onchange="updateMeal(\'' + mealType.id + '\')">' + optionsHTML + '</select></div></div>';
        container.appendChild(col);
    }
    
    document.getElementById('stepDays').style.display = 'none';
    document.getElementById('stepMeals').style.display = 'block';
    document.getElementById('breadcrumbTitle').textContent = 'اختر وجباتك - ' + dayName;
    document.getElementById('stepCounter').textContent = 'الخطوة 4 من 4';
    document.getElementById('btnBack').style.display = 'inline-block';
    
    updateSummary();
    updateSubmitButton();
    
    console.log('✅ Meals rendered');
}

// ============================================================
// ===== Selection Functions =====
// ============================================================

function selectMenu(menuId) {
    console.log('🔄 selectMenu called:', menuId);
    currentMenuId = menuId;
    currentDayId = null;
    selectedMeals = {};
    selectedWeek = null;
    selectedWeekDates = [];
    
    var btns = document.querySelectorAll('.menu-btn');
    for (var b = 0; b < btns.length; b++) {
        btns[b].classList.remove('active');
    }
    if (event && event.target) {
        var btn = event.target.closest('.menu-btn');
        if (btn) btn.classList.add('active');
    }
    
    document.getElementById('stepMenus').style.display = 'none';
    document.getElementById('stepWeek').style.display = 'block';
    document.getElementById('stepDays').style.display = 'none';
    document.getElementById('stepMeals').style.display = 'none';
    
    var menuName = '';
    for (var m = 0; m < menus.length; m++) {
        if (menus[m].id === menuId) {
            menuName = menus[m].name;
            break;
        }
    }
    document.getElementById('breadcrumbTitle').textContent = 'اختر الأسبوع - ' + menuName;
    document.getElementById('stepCounter').textContent = 'الخطوة 2 من 4';
    document.getElementById('btnBack').style.display = 'inline-block';
    
    renderWeeks(menuId);
}

function selectDay(dayId) {
    console.log('🔄 selectDay called:', dayId);
    currentDayId = dayId;
    selectedMeals = {};
    
    var btns = document.querySelectorAll('.day-btn');
    for (var b = 0; b < btns.length; b++) {
        btns[b].classList.remove('active');
    }
    if (event && event.target) {
        var btn = event.target.closest('.day-btn');
        if (btn) btn.classList.add('active');
    }
    
    renderMeals(dayId);
}

function updateMeal(mealId) {
    console.log('🔄 updateMeal called:', mealId);
    var select = document.getElementById('select-' + mealId);
    if (!select) return;
    var value = select.value;
    var status = document.getElementById('status-' + mealId);
    
    if (value) {
        selectedMeals[mealId] = value;
        if (status) {
            status.textContent = '✅ تم الاختيار';
            status.className = 'meal-status done';
        }
    } else {
        delete selectedMeals[mealId];
        if (status) {
            status.textContent = '⏳ لم يتم';
            status.className = 'meal-status';
        }
    }
    
    updateSummary();
    updateSubmitButton();
}

// ============================================================
// ===== Summary and Submit =====
// ============================================================

function updateSummary() {
    var container = document.getElementById('orderSummary');
    if (!container) return;
    
    var mealLabels = { breakfast: 'الفطور', lunch: 'الغداء', dinner: 'العشاء', snack: 'السناك', salad: 'السلطة' };
    var mealIcons = { breakfast: '🍳', lunch: '🍗', dinner: '🌙', snack: '🍰', salad: '🥗' };
    
    var html = '';
    for (var i = 0; i < MEAL_TYPES.length; i++) {
        var meal = MEAL_TYPES[i];
        var value = selectedMeals[meal.id] || '';
        var isSelected = value !== '';
        html += '<div class="summary-item ' + (isSelected ? '' : 'missing') + '"><span class="label">' + mealIcons[meal.id] + ' ' + mealLabels[meal.id] + '</span><span class="value ' + (isSelected ? '' : 'text-danger') + '">' + (isSelected ? value : '❌ لم يختار') + '</span></div>';
    }
    
    var menuName = '';
    for (var m = 0; m < menus.length; m++) {
        if (menus[m].id === currentMenuId) {
            menuName = menus[m].name;
            break;
        }
    }
    var dayName = '';
    for (var d = 0; d < days.length; d++) {
        if (days[d].id === currentDayId) {
            dayName = days[d].day_name;
            break;
        }
    }
    var weekName = selectedWeek ? selectedWeek.week_name : '';
    var weekRange = selectedWeek ? 'من ' + selectedWeek.start_date + ' إلى ' + selectedWeek.end_date : '';
    
    html += '<div class="summary-item"><span class="label">📋 المنيو</span><span class="value">' + menuName + '</span></div>';
    html += '<div class="summary-item"><span class="label">📅 اليوم</span><span class="value">' + dayName + (weekName ? ' (' + weekName + ')' : '') + '</span></div>';
    html += '<div class="summary-item" style="border-bottom: none;"><span class="label">📆 نطاق الأسبوع</span><span class="value" style="font-size:13px;">' + weekRange + '</span></div>';
    
    var nameInput = document.getElementById('customer_name');
    var name = nameInput ? nameInput.value || 'لم يكتب بعد' : 'لم يكتب بعد';
    html += '<div class="summary-item" style="border-top: 2px solid #e9ecef; margin-top: 6px; padding-top: 8px;"><span class="label">👤 الاسم</span><span class="value">' + name + '</span></div>';
    
    container.innerHTML = html;
}

function updateSubmitButton() {
    var btn = document.getElementById('submitOrder');
    var hint = document.getElementById('submitHint');
    if (!btn) return;
    
    var allSelected = true;
    for (var i = 0; i < MEAL_TYPES.length; i++) {
        if (!selectedMeals[MEAL_TYPES[i].id]) {
            allSelected = false;
            break;
        }
    }
    var nameInput = document.getElementById('customer_name');
    var name = nameInput ? nameInput.value.trim() : '';
    
    if (allSelected && name) {
        btn.disabled = false;
        if (hint) {
            hint.textContent = '✅ جميع الوجبات مختارة والاسم مكتوب - اضغط للإرسال';
            hint.className = 'text-success small mt-2';
        }
    } else {
        btn.disabled = true;
        var missing = [];
        var labels = { breakfast: 'الفطور', lunch: 'الغداء', dinner: 'العشاء', snack: 'السناك', salad: 'السلطة' };
        for (var i = 0; i < MEAL_TYPES.length; i++) {
            if (!selectedMeals[MEAL_TYPES[i].id]) {
                missing.push(labels[MEAL_TYPES[i].id]);
            }
        }
        var msg = '';
        if (!name) msg = '✏️ اكتب اسمك';
        if (missing.length > 0 && !name) msg += ' و';
        if (missing.length > 0) msg += '❌ اختر: ' + missing.join('، ');
        if (hint) {
            hint.textContent = msg || 'يرجى اختيار جميع الوجبات وكتابة الاسم';
            hint.className = 'text-muted small mt-2';
        }
    }
}

function goBack() {
    console.log('⬅️ goBack called');
    if (document.getElementById('stepMeals').style.display !== 'none') {
        document.getElementById('stepMeals').style.display = 'none';
        document.getElementById('stepDays').style.display = 'block';
        document.getElementById('breadcrumbTitle').textContent = 'اختر اليوم - ' + (selectedWeek ? selectedWeek.week_name : '');
        document.getElementById('stepCounter').textContent = 'الخطوة 3 من 4';
        var dots = document.querySelectorAll('.step-dot');
        for (var i = 0; i < dots.length; i++) {
            dots[i].className = 'step-dot';
            if (i === 0) dots[i].classList.add('done');
            if (i === 1) dots[i].classList.add('done');
            if (i === 2) dots[i].classList.add('active');
        }
        var lines = document.querySelectorAll('.step-line');
        for (var i = 0; i < lines.length; i++) {
            lines[i].className = 'step-line';
            if (i < 2) lines[i].classList.add('done');
        }
    } else if (document.getElementById('stepDays').style.display !== 'none') {
        document.getElementById('stepDays').style.display = 'none';
        document.getElementById('stepWeek').style.display = 'block';
        var menuName = '';
        for (var m = 0; m < menus.length; m++) {
            if (menus[m].id === currentMenuId) {
                menuName = menus[m].name;
                break;
            }
        }
        document.getElementById('breadcrumbTitle').textContent = 'اختر الأسبوع - ' + menuName;
        document.getElementById('stepCounter').textContent = 'الخطوة 2 من 4';
        var dots = document.querySelectorAll('.step-dot');
        for (var i = 0; i < dots.length; i++) {
            dots[i].className = 'step-dot';
            if (i === 0) dots[i].classList.add('done');
            if (i === 1) dots[i].classList.add('active');
        }
        var lines = document.querySelectorAll('.step-line');
        for (var i = 0; i < lines.length; i++) {
            lines[i].className = 'step-line';
            if (i === 0) lines[i].classList.add('done');
        }
    } else if (document.getElementById('stepWeek').style.display !== 'none') {
        document.getElementById('stepWeek').style.display = 'none';
        document.getElementById('stepMenus').style.display = 'block';
        document.getElementById('breadcrumbTitle').textContent = 'اختر المنيو';
        document.getElementById('stepCounter').textContent = 'الخطوة 1 من 4';
        document.getElementById('btnBack').style.display = 'none';
        var dots = document.querySelectorAll('.step-dot');
        for (var i = 0; i < dots.length; i++) {
            dots[i].className = 'step-dot';
            if (i === 0) dots[i].classList.add('active');
        }
        var lines = document.querySelectorAll('.step-line');
        for (var i = 0; i < lines.length; i++) {
            lines[i].className = 'step-line';
        }
    }
}

async function submitOrder() {
    console.log('📤 submitOrder called');
    var nameInput = document.getElementById('customer_name');
    var name = nameInput ? nameInput.value.trim() : '';
    
    var allSelected = true;
    for (var i = 0; i < MEAL_TYPES.length; i++) {
        if (!selectedMeals[MEAL_TYPES[i].id]) {
            allSelected = false;
            break;
        }
    }
    
    if (!allSelected || !name) {
        alert('يرجى اختيار جميع الوجبات وكتابة الاسم');
        return;
    }
    
    var menuName = '';
    for (var m = 0; m < menus.length; m++) {
        if (menus[m].id === currentMenuId) {
            menuName = menus[m].name;
            break;
        }
    }
    var dayName = '';
    for (var d = 0; d < days.length; d++) {
        if (days[d].id === currentDayId) {
            dayName = days[d].day_name;
            break;
        }
    }
    var weekName = selectedWeek ? selectedWeek.week_name : '';
    var weekRange = selectedWeek ? 'من ' + selectedWeek.start_date + ' إلى ' + selectedWeek.end_date : '';
    var orderDate = new Date().toLocaleDateString('ar-EG');
    
    try {
        await db.collection('orders').add({
            menu: menuName,
            day: dayName,
            week: weekName,
            week_number: selectedWeek ? selectedWeek.week_number : null,
            week_range: weekRange,
            order_date: orderDate,
            customer_name: name,
            breakfast: selectedMeals.breakfast || '',
            lunch: selectedMeals.lunch || '',
            dinner: selectedMeals.dinner || '',
            snack: selectedMeals.snack || '',
            salad: selectedMeals.salad || '',
            status: 'جديد',
            timestamp: new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Kuwait' }),
            createdAt: new Date()
        });
        console.log('✅ Order saved to Firebase');
    } catch (error) {
        console.error('❌ Error saving order:', error);
    }
    
    var message = 'طلب جديد - Cure Diet\n\nالمنيو: ' + menuName + '\nاليوم: ' + dayName + ' (' + orderDate + ')\nالأسبوع: ' + weekName + '\nنطاق الأسبوع: ' + weekRange + '\n\nالاسم: ' + name + '\n\nالفطور: ' + (selectedMeals.breakfast || '') + '\nالغداء: ' + (selectedMeals.lunch || '') + '\nالعشاء: ' + (selectedMeals.dinner || '') + '\nالسناك: ' + (selectedMeals.snack || '') + '\nالسلطة: ' + (selectedMeals.salad || '');
    
    var url = 'https://wa.me/+' + PHONE_NUMBER + '?text=' + encodeURIComponent(message);
    window.open(url, '_blank');
    
    alert('✅ تم إرسال الطلب بنجاح!');
    
    currentMenuId = null;
    currentDayId = null;
    selectedMeals = {};
    selectedWeek = null;
    selectedWeekDates = [];
    if (nameInput) nameInput.value = '';
    document.getElementById('submitOrder').disabled = true;
    renderMenus();
}

// ============================================================
// ===== Event Listeners =====
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM loaded');
    var nameInput = document.getElementById('customer_name');
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            updateSummary();
            updateSubmitButton();
        });
    }
    renderMenus();
});

// ============================================================
// ===== Make functions available globally =====
// ============================================================

window.selectMenu = selectMenu;
window.selectDay = selectDay;
window.updateMeal = updateMeal;
window.goBack = goBack;
window.submitOrder = submitOrder;
window.confirmWeek = confirmWeek;

console.log('✅ All functions defined!');