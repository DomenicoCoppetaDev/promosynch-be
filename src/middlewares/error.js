export default function genericError  (err, req, res, next) {
    console.log(err);

    res.status(err.statusCode || 500).send(err.message);
};
