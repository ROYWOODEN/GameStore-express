// import app from "./app.js"
const app = require('./app');

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Запущен на порту ${PORT}`);
    
})