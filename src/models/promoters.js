import mongoose, {Model, Schema} from 'mongoose';

const PromoterSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    surname: {
        type: String,
        required: true,
    },
    avatar: {
        type: String,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: function () {
            return this.googleId ? false : true
        },
    },
    googleId: {
        type: String,
        required: function () {
            return this.password ? false : true
        },
    },
    role: {
        type: String,
        default: 'promoter',
        required: true,
    },
});

export const Promoter = mongoose.model('promoters', PromoterSchema);