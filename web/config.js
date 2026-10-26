/* भैरव कैंटीन — सेटिंग
   firebase: Firebase कंसोल → Project settings → Web app से मिला कोड यहाँ आता है।
   (यह गुप्त नहीं है — डेटा की सुरक्षा firestore.rules से होती है) */
window.SE_CONFIG = {
  firebase: {
    // ⏳ विक्रम जी के नए Firebase प्रोजेक्ट "bhairav-canteen" का कोड यहाँ आएगा
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },
  // मालिक की ईमेल की छाप (SHA-256) — ईमेल यहाँ साफ़ नहीं लिखी जाती
  ownerHash: "d05c53d3cdca521782c90e21f807a1add61726965096709cb1ae4f3612b96151",
  ownerName: "विक्रम जी",
  // Google Apps Script वेब-ऐप का URL (…/exec) — खरीद के बिल की फोटो Drive में भेजने के लिए
  photoUrl: "",
  updateUrl: "https://177mhwcanteen-cyber.github.io/bhairav-canteen-app/"
};
