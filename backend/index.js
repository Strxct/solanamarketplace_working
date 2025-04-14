import Express from "express";
import connectToDb from "./src/utils/mongo-connection.js";
import routes from "./src/routes/index.js";
import bodyParser from "body-parser";

const app = Express();

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins (or specify your allowed origins)
  res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // No Content for preflight
  }

  next();
});

// Your routes should come after the middleware
app.use("", routes);



await connectToDb();

try {
  app.listen(3020, () => {
    console.log("Server running on port 3020");
  });
} catch (error) {
  console.log(error);
}
