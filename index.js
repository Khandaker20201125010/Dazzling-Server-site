const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5500;
require('dotenv').config()







//middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.texsw4y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const productCollection = client.db("DazzlingDB").collection("product");
    const reviewCollection = client.db("DazzlingDB").collection("reviews");
    const cartsCollection = client.db("DazzlingDB").collection("carts");
    const usersCollection = client.db("DazzlingDB").collection("users");

    //jwt section
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
      res.send({ token })
    })

    //jwt middleware
    const verifyToken= (req, res, next) => {
     
      if(!req.headers.authorization){
        return res.status(401).send({ message:'unauthorized access'})
      }
      const token  = req.headers.authorization.split (' ')[1];
     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(error, decoded) {
       if(error){
         return res.status(401).send({ message:'unauthorized access'})
       }
       req.decoded = decoded;
       next();
     })
    }

    //users section
    app.get('/users',verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)

    })
    
    app.get('/users/admin/:email',verifyToken, async (req, res) => {
        const email = req.params.email;
        if(email !== req.decoded.email){
         return res.status(403).send({message: 'forbidden access'})
        }
        const query = {email: email};
        const user = await usersCollection.findOne(query);
        let admin = false;
        if (user){
          admin = user.role === 'admin';
        }
        res.send({admin})
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existsUser = await usersCollection.findOne(query);
      if (existsUser) {
        return res.send({ message: 'user already exist', insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/users/role/:id', async (req, res) => {
      const id = req.params.id;
      const { role } = req.body; // Capture the role from the request body
  
      const filter = { _id: new ObjectId(id) };
  
      // If the role is being set to 'Admin', handle the admin reassignment logic
    
  
      // Update the user's role
      const updatedDoc = {
          $set: {
              role: role // Set the new role
          }
      };
  
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
  });


    //product section
    app.get('/product', async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await productCollection.find().skip(page * size).limit(size).toArray();
      res.send(result)
    })
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result)
    })
    app.get('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });
    //carts section 
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await cartsCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/carts', async (req, res) => {
      const carItem = req.body;
      const result = await cartsCollection.insertOne(carItem);
      res.send(result);
    })
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    })






    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Dazzeling is Selling')
})
app.listen(port, () => {
  console.log(`Dazzling is running ${port}`);
})