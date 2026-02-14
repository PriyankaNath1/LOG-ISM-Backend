import app from "./src/app.js";
import connectMongo from "./src/config/mongo.js";
import prisma from "./src/config/prisma.js";

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  await connectMongo();
  await prisma.$connect();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();