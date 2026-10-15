import express from "express";

const app = express();
const PORT = 3000;

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
