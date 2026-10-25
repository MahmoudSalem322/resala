# Fullstack Practice — Postman

استورد Fullstack-Practice.postman_collection.json وشغّل Express على http://localhost:3000 وPostgreSQL.

1. Register: أنشئ حسابًا. تكرار البريد يرجع 409.
2. Login: استخدم نفس الحساب. الرد يحتوي بيانات المستخدم وexpiresIn فقط، ويحفظ Postman التوكن تلقائيًا في Cookie Jar.
3. Create message: يرسل Postman Cookie تلقائيًا. لا تضف Bearer Token. استخدم نفس host في جميع الطلبات.
4. Logout: يمسح Cookie الدخول. إرسال رسالة بعدها يرجع 401.

Cookie باسم access_token، مدتها 900 ثانية، HttpOnly وSameSite=Strict وPath=/api. في production تستخدم Secure وتتطلب HTTPS.
لا يحتوي الملف على Cookie فعلية أو كلمة مرور السيرفر. إنشاء الحساب وإرسال الرسالة يحفظان بيانات فعلية.

الواجهة تستخدم credentials: include مع طلبات الدخول والرسائل والخروج. يسمح السيرفر بأصل الواجهة http://localhost:3001 ويرفض عمليات الكتابة من أصول أخرى.
GET /api/auth/me يسترجع المستخدم من Cookie ويرجع بياناته والمدة المتبقية دون تجديدها. نفّذه بعد Login، وبعد Logout تتوقع 401. الواجهة تستدعيه عند فتح الصفحة لاسترجاع الدخول بعد الرفرش. لا يوجد Refresh Token بعد.

الفحص العملي: node scripts/test-message-auth.js. ينشئ حسابًا ورسائل مؤقتة ويحذفها بعد الفحص.
