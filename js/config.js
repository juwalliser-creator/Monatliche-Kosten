const firebaseConfig = {
  apiKey: "AIzaSyCwUkHyS3nRgT7EkEqgIOOtGinzxg0NhbA",
  authDomain: "monatliche-kosten.firebaseapp.com",
  projectId: "monatliche-kosten",
  storageBucket: "monatliche-kosten.firebasestorage.app",
  messagingSenderId: "402924174767",
  appId: "1:402924174767:web:a4663c9d0b8e24b021435a"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const DEFAULT_CATEGORIES = [
  "Miete",
  "Versicherungen",
  "Handy",
  "Einkäufe",
  "Luxusartikel"
];

const PERSON_A = "personA";
const PERSON_B = "personB";
