const firebaseConfig = {
    apiKey: "AIzaSyAwMnc6B_9IUn57XRm8BN696rknOeHe88w",
    authDomain: "fastmac-98ba2.firebaseapp.com",
    databaseURL: "https://fastmac-98ba2-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "fastmac-98ba2",
    storageBucket: "fastmac-98ba2.firebasestorage.app",
    messagingSenderId: "129477015226",
    appId: "1:129477015226:web:721d174e3780a563953483"
};

// Initialize Firebase and export the db instance
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} catch (error) {
    console.error('Error initializing Firebase:', error);
    // Add a flag to indicate Firebase failed
    window.firebaseInitFailed = true;
}

// Export the database instance
window.db = db;