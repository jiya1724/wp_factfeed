const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Main routes
app.use("/twilio", require("./routes/Whatsapp"));

// Health check
app.get('/', (req, res) => {
  res.send('Node server started successfully!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});