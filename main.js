// تكوين Firebase - سيتم استبداله بالبيانات الخاصة بك
const firebaseConfig = {
    // يرجى ملء هذه البيانات من لوحة تحكم Firebase الخاصة بك
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    databaseURL: ""
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// عناصر DOM
const authSection = document.getElementById('auth-section');
const profileSection = document.getElementById('profile-section');
const messagesSection = document.getElementById('messages-section');
const sendMessageSection = document.getElementById('send-message-section');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const authMessage = document.getElementById('auth-message');

const welcomeMessage = document.getElementById('welcome-message');
const profileLink = document.getElementById('profile-link');
const copyLinkBtn = document.getElementById('copy-link-btn');

const messagesContainer = document.getElementById('messages-container');
const recipientName = document.getElementById('recipient-name');
const messageText = document.getElementById('message-text');
const sendMessageBtn = document.getElementById('send-message-btn');
const sendMessageStatus = document.getElementById('send-message');

// إعداد الحدث عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // أولاً، التحقق إذا كانت الصفحة مفتوحة لإرسال رسالة
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user');
    
    if (userId) {
        // إظهار قسم إرسال الرسائل وإخفاء الأقسام الأخرى فوراً
        authSection.classList.add('hidden');
        profileSection.classList.add('hidden');
        messagesSection.classList.add('hidden');
        sendMessageSection.classList.remove('hidden');
        
        // استدعاء الدالة لتحميل بيانات المستخدم المستلم
        showSendMessageSection(userId);
    } else {
        // تفقد حالة المستخدم فقط إذا لم تكن الصفحة لإرسال رسالة
        auth.onAuthStateChanged(user => {
            if (user) {
                // المستخدم قد سجل الدخول
                showUserProfile(user);
                loadUserMessages(user.uid);
            } else {
                // المستخدم غير مسجل الدخول
                showAuthSection();
            }
        });
    }

    // تعيين أحداث النقر للأزرار
    setupEventListeners();
});

// دالة إعداد الأحداث
function setupEventListeners() {
    // أحداث المصادقة
    loginBtn.addEventListener('click', handleLogin);
    signupBtn.addEventListener('click', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);
    
    // نسخ الرابط
    copyLinkBtn.addEventListener('click', copyProfileLink);
    
    // إرسال رسالة
    sendMessageBtn.addEventListener('click', handleSendMessage);
}

// دوال المصادقة
async function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!validateCredentials(email, password)) return;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        clearAuthFields();
    } catch (error) {
        showAuthError(error.message);
    }
}

async function handleSignup() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!validateCredentials(email, password)) return;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // إنشاء معلومات المستخدم في قاعدة البيانات
        await database.ref('users/' + user.uid).set({
            email: email,
            username: email.split('@')[0],  // استخدام البريد الإلكتروني كاسم مستخدم مبدئي
            joinDate: new Date().toISOString()
        });
        
        clearAuthFields();
    } catch (error) {
        showAuthError(error.message);
    }
}

function handleLogout() {
    auth.signOut().then(() => {
        showAuthSection();
    }).catch(error => {
        console.error('خطأ في تسجيل الخروج:', error);
    });
}

// التحقق من صحة المدخلات
function validateCredentials(email, password) {
    if (!email || !password) {
        showAuthError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
        return false;
    }
    
    if (password.length < 6) {
        showAuthError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
        return false;
    }
    
    return true;
}

// عرض رسالة خطأ في المصادقة
function showAuthError(message) {
    authMessage.textContent = message;
    authMessage.className = 'message error-message';
}

// مسح حقول المصادقة
function clearAuthFields() {
    emailInput.value = '';
    passwordInput.value = '';
    authMessage.textContent = '';
}

// عرض قسم المصادقة
function showAuthSection() {
    authSection.classList.remove('hidden');
    profileSection.classList.add('hidden');
    messagesSection.classList.add('hidden');
    sendMessageSection.classList.add('hidden');
}

// عرض الملف الشخصي للمستخدم
async function showUserProfile(user) {
    authSection.classList.add('hidden');
    profileSection.classList.remove('hidden');
    messagesSection.classList.remove('hidden');
    sendMessageSection.classList.add('hidden');
    
    try {
        const snapshot = await database.ref('users/' + user.uid).once('value');
        const userData = snapshot.val();
        
        if (userData) {
            welcomeMessage.textContent = `مرحباً بك، ${userData.username || user.email}!`;
        } else {
            welcomeMessage.textContent = `مرحباً بك، ${user.email}!`;
        }
        
        // إعداد رابط الملف الشخصي
        const currentURL = window.location.origin + window.location.pathname;
        profileLink.value = `${currentURL}?user=${user.uid}`;
    } catch (error) {
        console.error('خطأ في تحميل بيانات المستخدم:', error);
    }
}

// تحميل رسائل المستخدم
async function loadUserMessages(userId) {
    messagesContainer.innerHTML = '';
    
    try {
        const snapshot = await database.ref('messages/' + userId).once('value');
        const messages = snapshot.val();
        
        if (messages) {
            // تحويل البيانات إلى مصفوفة وترتيبها حسب التاريخ (الأحدث أولاً)
            const messageArray = Object.keys(messages).map(key => ({
                id: key,
                ...messages[key]
            }));
            
            messageArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // عرض الرسائل
            messageArray.forEach(message => {
                const messageCard = createMessageCard(message);
                messagesContainer.appendChild(messageCard);
            });
        } else {
            // لا توجد رسائل بعد
            const noMessages = document.createElement('p');
            noMessages.textContent = 'لا توجد رسائل حتى الآن. شارك رابطك مع أصدقائك ليرسلوا لك رسائل مجهولة.';
            messagesContainer.appendChild(noMessages);
        }
    } catch (error) {
        console.error('خطأ في تحميل الرسائل:', error);
        const errorEl = document.createElement('p');
        errorEl.textContent = 'حدث خطأ أثناء تحميل الرسائل. يرجى المحاولة مرة أخرى لاحقاً.';
        errorEl.className = 'error-message';
        messagesContainer.appendChild(errorEl);
    }
}

// إنشاء بطاقة رسالة
function createMessageCard(message) {
    const messageCard = document.createElement('div');
    messageCard.className = 'message-card';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = message.content;
    
    const messageDate = document.createElement('div');
    messageDate.className = 'message-date';
    
    // تنسيق التاريخ
    const date = new Date(message.timestamp);
    messageDate.textContent = date.toLocaleString('ar-EG');
    
    messageCard.appendChild(messageContent);
    messageCard.appendChild(messageDate);
    
    return messageCard;
}

// عرض قسم إرسال الرسائل
async function showSendMessageSection(userId) {
    // التأكد من إظهار قسم إرسال الرسائل وإخفاء الأقسام الأخرى
    authSection.classList.add('hidden');
    profileSection.classList.add('hidden');
    messagesSection.classList.add('hidden');
    sendMessageSection.classList.remove('hidden');
    
    try {
        const snapshot = await database.ref('users/' + userId).once('value');
        const userData = snapshot.val();
        
        if (userData) {
            recipientName.textContent = userData.username || 'مستخدم هيرو';
            sendMessageBtn.setAttribute('data-recipient', userId);
        } else {
            // إذا لم يتم العثور على المستخدم
            recipientName.textContent = 'مستخدم غير معروف';
            sendMessageBtn.disabled = true;
            sendMessageStatus.textContent = 'لم يتم العثور على المستخدم. تأكد من صحة الرابط.';
            sendMessageStatus.className = 'message error-message';
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات المستلم:', error);
        sendMessageStatus.textContent = 'حدث خطأ أثناء تحميل بيانات المستلم. تأكد من صحة الرابط.';
        sendMessageStatus.className = 'message error-message';
    }
}

// إرسال رسالة
async function handleSendMessage() {
    const recipientId = sendMessageBtn.getAttribute('data-recipient');
    const content = messageText.value.trim();
    
    if (!content) {
        sendMessageStatus.textContent = 'يرجى كتابة رسالة قبل الإرسال';
        sendMessageStatus.className = 'message error-message';
        return;
    }
    
    try {
        // إنشاء معرف فريد للرسالة
        const messageRef = database.ref('messages/' + recipientId).push();
        
        // إرسال الرسالة
        await messageRef.set({
            content: content,
            timestamp: new Date().toISOString(),
        });
        
        // إظهار رسالة نجاح
        messageText.value = '';
        sendMessageStatus.textContent = 'تم إرسال الرسالة بنجاح!';
        sendMessageStatus.className = 'message success-message';
        
        // إعادة تعيين بعد 3 ثوانٍ
        setTimeout(() => {
            sendMessageStatus.textContent = '';
            sendMessageStatus.className = 'message';
        }, 3000);
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        sendMessageStatus.textContent = 'حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.';
        sendMessageStatus.className = 'message error-message';
    }
}

// نسخ رابط الملف الشخصي
function copyProfileLink() {
    profileLink.select();
    document.execCommand('copy');
    
    // إظهار تأكيد مؤقت
    const originalText = copyLinkBtn.textContent;
    copyLinkBtn.textContent = 'تم النسخ!';
    
    setTimeout(() => {
        copyLinkBtn.textContent = originalText;
    }, 2000);
}