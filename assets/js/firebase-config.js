// Import the functions you need from the SDKs you need
//import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHrTCypkTmAyQKSkt92ym9tX5vUh7iZ6o",
  authDomain: "ingeniumbot-9fb30.firebaseapp.com",
  projectId: "ingeniumbot-9fb30",
  storageBucket: "ingeniumbot-9fb30.firebasestorage.app",
  messagingSenderId: "34223540759",
  appId: "1:34223540759:web:bb1105f0c86263610caa52"
};

// Initialize Firebase
//const app = initializeApp(firebaseConfig);

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();