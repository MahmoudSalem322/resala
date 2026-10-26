# Fullstack Practice — Postman

تعديل الرسالة: نفّذ Create message ثم Update my message قبل حذفها، باستخدام messageId المحفوظ وupdatedMessage للنص الجديد. PATCH /api/messages/:id يرجع200 مع الرسالة بعد التعديل. يرجع404 لرسالة غير موجودة أو لحساب آخر، و400 للرقم غير الصالح أو النص الفارغ أو الأطول من5000 حرف. الحد30 محاولة تعديل بالدقيقة لكل حساب مستقل عن الإرسال والحذف. فحص ببيانات مؤقتة: node scripts/test-message-update.js.

حذف الرسالة: نفّذ Create message ثم DELETE /api/messages/{{messageId}} بحساب صاحبها. الطلب يمسح الرسالة نهائيًا ويرجع 204 بدون جسم؛ التكرار أو استخدام رقم رسالة حساب آخر يرجع 404. الحد 30 طلب حذف بالدقيقة لكل حساب، مستقل عن الإرسال. فحص الحذف ببيانات مؤقتة: node scripts/test-message-delete.js.

حدود الطلبات: الدخول 5 محاولات فاشلة لكل إيميل وعنوان اتصال خلال 15 دقيقة، وبحد عام 20 محاولة فاشلة لنفس الاتصال. التسجيل 5 طلبات بالساعة لكل اتصال. إرسال الرسائل 10 طلبات بالدقيقة لكل حساب. عند التجاوز يرجع 429 مع Retry-After بالثواني؛ انتظر المدة قبل إعادة الطلب. التفاصيل في docs/rate-limits.md.

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

طلب My messages: GET /api/messages يرجع رسائل الحساب المسجّل فقط بترتيب created_at DESC ثم id DESC. لا ترسل user_id؛ السيرفر يأخذه من الجلسة. إذا لم توجد رسائل يرجع 200 مع data: []، وبدون دخول يرجع 401. نفّذه بعد Login وقبل Logout. الفحص العملي: node scripts/test-message-list.js.
