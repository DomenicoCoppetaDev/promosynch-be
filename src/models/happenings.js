import mongoose, {Model, Schema} from 'mongoose';

const HappeningSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    start: {
        type: Date,
        required: true,
    },
    end: {
        type: Date,
        required: true,
    },
    cover: {
        type: String,
    },
    promoter: {
        type: Schema.Types.ObjectId,
        ref: 'promoters',
        required: true,
    },
    ticketPrice: {
        type: String,
    },
    location: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    clients: [
        {
            happeningId: {
            type: Schema.Types.ObjectId,
            ref: 'happenings',
            },
            name: {
            type: String,
            },
            surname: {
            type: String,
            },
            email: {
            type: String,
            },
            checkedIn: {
            type: Boolean,
            default: false,
            },
            role: {
            type: String,
            default: 'client',
            }
        },
    ]
});

export const Happening = mongoose.model('happenings', HappeningSchema);