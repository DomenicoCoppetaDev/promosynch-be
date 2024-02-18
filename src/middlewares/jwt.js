import jwt from 'jsonwebtoken';
import { Promoter } from '../models/promoters.js';

const jwtGate = async (req, res, next) => {
    
    try {
        const token = req.headers.authorization.split(" ")[1]
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.user = await Promoter.findById(payload.id).select('-password')

        if (!req.user) {
            return res.status(404).json({message: "Promoter not found"})
        }
        next()
    } catch (err) {
        return res.status(401).json({message: 'Invalid token'})
    }
}

export default jwtGate;