import express from 'express';
import { Happening } from '../models/happenings.js';
import { DefaultHappeningCover } from '../assets/DefaultHappeningsCover.js';
import multer from 'multer';
import mongoose from 'mongoose';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import jwtGate from "../middlewares/jwt.js";
import brevo from '@getbrevo/brevo';


const happeningsRouter = express.Router();


const cloudinaryStorage = new CloudinaryStorage({
  cloudinary, 
  params: {
    folder: 'promosynch',
  },
});

const upload = multer({ storage: cloudinaryStorage });

let apiInstance = new brevo.TransactionalEmailsApi()
let apiKey = apiInstance.authentications["apiKey"]
apiKey.apiKey = process.env.BREVO_API_KEY 

happeningsRouter.get('/test', (req, res) => {
  res.json({ message: 'Events Router OK' });
})

// All the events
.get('/', jwtGate, async (req, res, next) => {
  try {
    const happenings = await Happening.find({});
    res.json(happenings);
  } catch (error) {
    next(error);
  }
})

// One specific event by ID
.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const happening = await Happening.findById(id);

    if (!happening) {
      return res.status(404).send();
    }
    res.json(happening);
  } catch (error) {
    next(error);
  }
})


// All the events by one promoter
.get('/promoter/:promoter', jwtGate, async (req, res, next) => {
  try {
    const { promoter } = req.params;
  
    if (!promoter) {
      return res.json([]);
    }

    const happenings = await Happening.find({ promoter: promoter });
    res.json(happenings);
  } catch (error) {
    next(error);
  }
})

// Create a new event
.post('/create', upload.single('cover') ,jwtGate,  async (req, res, next) => {
  try {
    const coverPath = req.file ? req.file.path : undefined;
    const result = coverPath ? await cloudinary.uploader.upload(coverPath) : { secure_url: DefaultHappeningCover };

    const newHappening = new Happening({
      ...req.body,
      cover: result.secure_url,
    });
    await newHappening.save();
    res.status(201).json(newHappening);
  } catch (error) {
    console.error(error);
    next(error);
  }
})

// Delete an event by ID
.delete('/:id', jwtGate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedHappening = await Happening.findByIdAndDelete(id);

    if (!deletedHappening) {
      return res.status(404).send();
    } else {
      res.status(204).send();
    }
  } catch (error) {
    next(error);
  }
})

// Updates Cover the required promoter (file upload)
.patch('/:id/ucover', jwtGate, upload.single('cover'), async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato.' });
        }
        const newCoverPath = req.file.path;

        const updatedHappening = await Happening.findByIdAndUpdate(
            { "_id": id },
            {
                $set: {
                    "cover": newCoverPath
                }
            },
            {
                new: true
            }
        )

        if (!updatedHappening) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        res.json(updatedHappening.cover);
    } catch (error) {
        next(error);
    }
})



// Register a client to an event
.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, surname, email, dateOfBirth, happeningId } = req.body;

    const happening = await Happening.findById(id);

    if (!happening) {
      return res.status(404).json({ error: 'Happening non trovato' });
    }

    const existingUser = happening.clients.find(client =>
      client.name === name &&
      client.surname === surname &&
      client.email === email &&
      client.dateOfBirth === dateOfBirth &&
      client.happeningId === happeningId
    );

    if (existingUser) {
      return res.status(400).json({ error: 'User already registered' });
    }

    happening.clients.push({
      happeningId,
      name,
      surname,
      email,
      dateOfBirth,
      role: 'client',
    });
    const updatedHappening = await happening.save();

    let sendSmtpEmail  = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = "Registration confirmed for {{params.parameter}}"
    sendSmtpEmail.htmlContent = 
    "<html><body><h1>Your partecipation to {{params.parameter}} is confirmed!</h1><p>In order to gain access to the event You are required to show a valid Id</p></p></body></html>";
    sendSmtpEmail.sender = { name: "Promosynch", email: "noreply@promosynch.com"}
    sendSmtpEmail.to = [{ email: email , name: name}]

    sendSmtpEmail.params = {
      parameter: happening.title
    }

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail)

    console.log( "API called successfully. Returned data: " + JSON.stringify(data, null, 2));
    return res.status(200).json(updatedHappening);
  } catch (error) {
    console.error(error);
    return res.status(500).json({error})
  }
})


// All the clients register by one promoter
.get('/clients/:promoterId', jwtGate, async (req, res, next) => {
  try {
    const { promoterId } = req.params;

    if (!promoterId) {
      return res.json([]);
    }

    const result = await Happening.aggregate([
      {
        $match: {
          promoter: new mongoose.Types.ObjectId(promoterId)
        }
      },
      {
        $project: {
          clients: {
            $map: {
              input: "$clients",
              as: "client",
              in: {
                name: "$$client.name",
                surname: "$$client.surname",
                email: "$$client.email",
                checkedIn: "$$client.checkedIn",
                happeningId: "$$client.happeningId" 
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          clientsTotal: {
            $push: "$clients"
          }
        }
      },
      {
        $project: {
          _id: 0,
          clientsTotal: {
            $reduce: {
              input: "$clientsTotal",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] }
            }
          }
        }
      }
    ]);

    const clientsTotal = result.length > 0 ? result[0].clientsTotal : [];
    res.json(clientsTotal);
  } catch (error) {
    next(error);
  }
})

// updates a specific Event
.put('/:id/update', async (req, res, next) => {
  try {
      const { id } = req.params;

      if (!req.body.title && !req.body.start && !req.body.end && !req.body.ticketPrice && !req.body.location && !req.body.description) {
          return res.status(400).json({ error: 'Nessun dato valido fornito per l\'aggiornamento.' });
      }

      const updateFields = {
          title: req.body.title,
          start: req.body.start,
          end: req.body.end,
          ticketPrice: req.body.ticketPrice,
          location: req.body.location,
          description: req.body.description,
      };

      const updatedHappening = await Happening.findByIdAndUpdate(
          id,
          { $set: updateFields },
          { new: true }
      );

      if (!updatedHappening) {
          return res.status(404).send();
      }

      res.json(updatedHappening);
  } catch (error) {
      next(error);
  }
})


export default happeningsRouter;
