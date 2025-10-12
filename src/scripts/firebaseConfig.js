const firebaseConfig = {
    apiKey: "AIzaSyDrWZDS6X6sW43NIESsLwIQSKDlSB1wlcQ",
    authDomain: "csc4330-b12f9.firebaseapp.com",
    projectId: "csc4330-b12f9",
    storageBucket: "csc4330-b12f9.firebasestorage.app",
    messagingSenderId: "551810136457",
    appId: "1:551810136457:web:d3cbf10284a3f9663a8958"
};

let db = null;

function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        return db;
    } catch (error) {
        throw error;
    }
}

window.FirebaseConfig = {
    init: initFirebase,
    getDb: () => db
};