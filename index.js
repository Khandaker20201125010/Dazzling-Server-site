const express = require('express');
const app = express();
const cors = require('cors');
const SSLCommerzPayment = require('sslcommerz-lts')
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

const store_id = process.env.STORE_ID
const store_passwd = process.env.STORE_PASSWD
const is_live = false //true for live, false for sandbox

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
    const shippingsCollection = client.db("DazzlingDB").collection("shippings");
    const orderCollection = client.db("DazzlingDB").collection("order");

    //jwt section
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
      res.send({ token });
    })

    // middlewares 
    //verify jwt
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Forbidden access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'Admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      next();
    }

    //users section
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)

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
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'Admin';
      }
      res.send({ admin });
    })
    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { role } = req.body; // Capture the role from the request body
      const filter = { _id: new ObjectId(id) };
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
    app.get('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });
    app.post('/product', verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await productCollection.insertOne(item);
      res.send(result);
    })
    app.patch('/product/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name, // Referencing `item` instead of `data`
          brand: item.brand,
          price: item.price,
          rating: item.rating,
          quantity: item.quantity,
          image: item.image,
          reviews: item.reviews,
          description: item.description,
          category: item.category,
        }
      }
      const result = await productCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.delete('/product/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    //carts section 

    app.post('/carts', async (req, res) => {
      const carItem = req.body;
      const result = await cartsCollection.insertOne(carItem);
      res.send(result);
    });
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await cartsCollection.find(query).toArray();
      res.send(result)
    });

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    //reviews section
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result)
    });

    //shippings section
    app.get('/shippings', async (req, res) => {
      const result = await shippingsCollection.find().toArray();
      res.send(result)
    });
    app.post('/shippings', async (req, res) => {
      const shipping = req.body;
      const result = await shippingsCollection.insertOne(shipping);
      res.send(result);
    })
    //sslcommerz section

    app.post('/order', async (req, res) => {
      const body = req.body
      const products = await cartsCollection.find({ email: body?.email }).toArray()
      const price = products.map(product => product?.price)
      const totalPrice = price?.reduce((sum, price) => sum + price, 0)
      const amount = parseInt(totalPrice + body?.shippingMethod)
      const tranId = new ObjectId().toString()
      const data = {
        total_amount: amount,
        currency: body?.currency,
        tran_id: tranId,
        success_url: `http://localhost:5500/payment/success/${tranId}`,
        fail_url: `http://localhost:5500/payment/fail/${tranId}`,
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: body.name,
        cus_email: body.email,
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: body.phone,
        // cus_fax: '01711111111',
        ship_name: body.name,
        ship_add1: body.shippingArea,
        // ship_add2: 'Dhaka',
        ship_city: body.shippingArea,
        // ship_state: 'Dhaka',
        cus_add1: body.address,
        // cus_add2: 'Dhaka',
        // cus_city: 'Dhaka',
        // cus_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };


      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURl = apiResponse.GatewayPageURL
        res.send({ url: GatewayPageURl })
        const orderData = {
          data: body,
          paidStatus: false,
          status: 'pending',
          transactionId: tranId
        }
        const result = orderCollection.insertOne(orderData)
      });
    })
    // get all orders 
    app.get('/order', async (req, res) => {
      const result = await orderCollection.find().toArray()
      res.send(result)
    })
    app.put('/order/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status } };

      const result = await orderCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get orders by email
    app.get('/order/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      // Modify the query to find orders where the email is nested under `data.email`
      const result = await orderCollection.find({ "data.email": email }).toArray();
      res.send(result);
    });


    // get orders by transactionId 
    app.get('/order/or/:tranId', async (req, res) => {
      const tranId = req.params.tranId
      const result = await orderCollection.find({ transactionId: tranId }).toArray()
      res.send(result)
    })


    //payment
    app.post('/payment/success/:tranId', async (req, res) => {
      const tranId = req.params.tranId

      const result = await orderCollection.updateOne({ transactionId: tranId }, {
        $set: {
          paidStatus: true
        }
      })
      if (result.modifiedCount > 0) {
        const order = await orderCollection.findOne({ transactionId: tranId });
        if (order && order?.data?.productsIds) {
          // Delete items from the cart collection
          const query = {
            _id: {
              $in: order?.data?.productsIds.map(id => new ObjectId(id))
            }
          };
          await cartsCollection.deleteMany(query);
        }
        res.redirect(`http://localhost:5173/payment/success/${tranId}`)
      }
    })
    // order delete when payment faile 
    app.post('/payment/fail/:tranId', async (req, res) => {
      const tranId = req.params.tranId
      const result = await orderCollection.deleteOne({ transactionId: tranId })
      if (result.deletedCount) {
        res.redirect(`http://localhost:5173/payment/fail/${tranId}`)
      }
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