const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
var cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: [
      // 'http://localhost:5173',
      'https://car-clinic-d3b32.web.app',
      'https://car-clinic-d3b32.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.t241ufd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleware

const logger = (req, res, next) => {
  // console.log('logger info : ', req.method , req.url)
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  //console.log("token from middleware ", token);
  if (!token) {
   return res.status(401).send({Message : 'unauthorized ACCESS'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
    if (err) {
      return  res.status(401).send({Message : 'unauthorized ACCESS'})
    }
    //console.log(decoded)
    req.user = decoded;
    next();
  });
};

const cookieOption = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("bookings");

    //auth related api

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      //console.log("from jwt", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
      //console.log(token);
      res
        .cookie("token", token, cookieOption)
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
        console.log("from logout", user);
        res.clearCookie('token', { ...cookieOption , maxAge: 0 }).send({ success: true });
     // res.clearCookie('token')
    });

    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      console.log(cursor);
      const result = await cursor.toArray();
      console.log(object);
      res.send(cursor);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };

      const result = await serviceCollection.findOne(query, options);
      res.send(result)
    });

    // bookings
    app.get("/bookings", verifyToken, async (req, res) => {
      //console.log(req.query.email);
      // console.log('From token cookies value' ,req.cookies );
       console.log('From middleware token email value' , req?.user?.email )
       if (req?.query?.email !== req?.user?.email) {
        res.status(401).send({Message : 'unauthorized access'})
       }

      let query = {};
      if (req?.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req?.params?.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      console.log(updatedBooking);
      const updateDoc = {
        $set: {
          status: updatedBooking.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
   // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctor is running");
});

app.listen(port, () => {
  console.log(`Car Doctor Server is running on port ${port}`);
});
