// static/js/firebase-config.js

// Initialize Firebase with your config
const firebaseConfig = {
    // Replace with your Firebase project configuration
    apiKey: "AIzaSyAwMnc6B_9IUn57XRm8BN696rknOeHe88w",
    authDomain: "fastmac-98ba2.firebaseapp.com",
    databaseURL: "https://fastmac-98ba2-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "fastmac-98ba2",
    storageBucket: "fastmac-98ba2.firebasestorage.app",
    messagingSenderId: "129477015226",
    appId: "1:129477015226:web:721d174e3780a563953483"
};

// Initialize Firebase using the compatibility version
firebase.initializeApp(firebaseConfig);

// Get Firestore instance
const db = firebase.firestore();

// Helper function to fetch all tools data
async function fetchToolsData() {
    try {
        const categoriesSnapshot = await db.collection('categories').get();
        const toolsSnapshot = await db.collection('tools').get();
        
        const categories = {};
        
        // Process categories first
        categoriesSnapshot.forEach(doc => {
            categories[doc.id] = {
                name: doc.data().name,
                tools: {}
            };
        });
        
        // Add tools to their respective categories
        toolsSnapshot.forEach(doc => {
            const toolData = doc.data();
            const categoryId = toolData.category;
            
            if (categories[categoryId]) {
                categories[categoryId].tools[doc.id] = {
                    name: toolData.name,
                    description: toolData.description,
                    brew_package: toolData.brew_package,
                    check_command: toolData.check_command,
                    post_install: toolData.post_install,
                    requires: toolData.requires,
                    type: toolData.type,
                    cask: toolData.cask,
                    install_command: toolData.install_command,
                    pre_install: toolData.pre_install
                };
            }
        });
        
        return categories;
    } catch (error) {
        console.error('Error fetching tools data:', error);
        throw error;
    }
}