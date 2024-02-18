import express from "express";
import { Promoter } from "../models/promoters.js";
import bcrypt from "bcrypt";
import multer from "multer";
import jwt from "jsonwebtoken";
import jwtGate from "../middlewares/jwt.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from 'cloudinary';
import passport from "passport";



const promotersRouter = express.Router();

const cloudinaryStorage = new CloudinaryStorage({
    cloudinary, 
    params: {
        folder:'promosynch',
    },
});

const upload = multer({ storage: cloudinaryStorage })

// promoters login
promotersRouter.post('/session', async (req, res) => {
    const { email, password } = req.body
    const promoter = await Promoter.findOne({ email });

    if (!promoter) {   
        return res.status(404).json({ message: "Promoter not found"})
    }

    const passwordOk = bcrypt.compare(password, promoter.password)

    if(!passwordOk) {
        return res.status(401).json({ message: "Wrong credentials"})
    }
    const payload = { id: promoter._id}
    const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: "3h"})

    res.status(200).json({ promoterId: promoter._id, token })
});


//google oauth
promotersRouter.get(
    "/oauth-google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
        prompt: "select_account", 
    })
);

//google oauth callback

promotersRouter.get(
    "/oauth-callback",
    passport.authenticate("google", {
        failureRedirect: "/",
        session: false,
    }),
    async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Authentication failed" });
            }

            const payload = { id: req.user._id };
            console.log(payload)
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: "3h",
            });
            res.redirect(
                `${process.env.FRONTEND_ENDPOINT}?token=${token}&promoterId=${req.user._id}`
            )

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
);  

promotersRouter.get('/test', (req, res) => {
    res.json({message: 'Promoters Router OK'});
});

// create a new promoter
promotersRouter.post('/register', upload.single('avatar'), async (req, res, next) => {
    const password = await bcrypt.hash(req.body.password, 10)
    const email = req.body.email.toLowerCase()
    const defaultAvatar = 'https://res.cloudinary.com/dvof2wzo4/image/upload/v1703698897/promosynch/og9c38jadmll2aupahhw.jpg';
    try {
        const existingPromoter = await Promoter.findOne({ email: email });
        if (existingPromoter) {
            return res.status(400).json({ message: 'Email already in use'});
        }
        const avatarPath = req.file ? req.file.path : undefined;
        const result = avatarPath
            ? await cloudinary.uploader.upload(avatarPath)
            : { secure_url: defaultAvatar };

        const newPromoter = await Promoter.create({
            ...req.body,
            avatar: result.secure_url,
            password,
        }); 
        
        const { password: _, __v, ...newPromoterWithoutPassword } = newPromoter.toObject();
        res.status(201).json({newPromoterWithoutPassword});
    } catch (error) {
        console.error(error)
        next(error)
    }
});

//update credentials
promotersRouter.patch('/:id/credentials', jwtGate, async (req, res, next) => {

    const { password, newPassword, newEmail} = req.body;
    const { id } = req.params;

    const promoter = await Promoter.findOne({ "_id": id });
    if (!promoter) {   
        return res.status(404).json({ message: "Promoter not found"})
    }

    const passwordOk = bcrypt.compare(password, promoter.password);

    if (!passwordOk) {
        return res.status(401).json({ message: "Wrong password" });
    }


    try {
        const updatedPassword = await bcrypt.hash(newPassword, 10);

        const updateFields = {
            password: updatedPassword,
            email: newEmail
        };

        const updatedPromoter = await Promoter.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true }
        ).select('-password -role');

        if (!updatedPromoter) {
            return res.status(404).send();
        }

        res.json(updatedPromoter);
    } catch (error) {
        next(error);
    }
});



//all the promoters
// .get('/', jwtGate, async (req, res, next) => {
//     try {
//     const promoters = await Promoter.find({}).select('-password -role');
//     res.json(promoters);
//     } catch (error) {
//     next(error);
//     }
// })

// // one specific promoter
promotersRouter.get('/:id',jwtGate, async (req, res, next) => {
    try {
        const { id } = req.params
        const promoter = await Promoter.findById(id);
  
        if (!promoter) {
          return res.status(404).json({message: 'Promoter not found'});
        }
        res.json(promoter)
      } catch (error) {
          next(error);
        }
        // res.status(200).json(req.user)
    });

// updates a specific promoter
promotersRouter.put('/:id/update', jwtGate, async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!req.body.name && !req.body.surname && !req.body.dateOfBirth) {
            return res.status(400).json({ error: 'Nessun dato valido fornito per l\'aggiornamento.' });
        }

        const updateFields = {
            name: req.body.name,
            surname: req.body.surname,
            dateOfBirth: req.body.dateOfBirth,
        };

        const updatedPromoter = await Promoter.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true }
        ).select('-password -role');

        if (!updatedPromoter) {
            return res.status(404).send();
        }

        res.json(updatedPromoter);
    } catch (error) {
        next(error);
    }
});

// Updates AVATAR the required promoter (file upload)
promotersRouter.patch('/:id/profpic', jwtGate, upload.single('avatar'), async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato.' });
        }
        const newAvatarPath = req.file.path;

        const updatedPromoter = await Promoter.findByIdAndUpdate(
            { "_id": id },
            {
                $set: {
                    "avatar": newAvatarPath
                }
            },
            {
                new: true
            }
        )

        if (!updatedPromoter) {
            return res.status(404).json({ error: 'Promoter not found.' });
        }
        res.json(updatedPromoter.avatar);
    } catch (error) {
        next(error);
    }
});

// deletes a specific promoter
promotersRouter.delete('/:id', jwtGate, async (req, res, next) => {
  try {
    const { id } = req.params
    const deletedPromoter = await Promoter.findByIdAndDelete(id);

    if (!deletedPromoter) {
        return res.status(404).send();
    } else {
        console.log(deletedPromoter.name, deletedPromoter.surname + "successfully deleted ");
        res.status(204).send();
    }
  } catch (error) {
      next(error);
  }
});




export default promotersRouter