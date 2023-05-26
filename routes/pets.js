const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const Upload = require('s3-uploader');

const client = new Upload(process.env.S3_BUCKET, {
  aws: {
    path: 'pets/avatar',
    region: process.env.S3_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  cleanup: {
    versions: true,
    original: true
  },
  versions: [{
    maxWidth: 400,
    aspect: '16:10',
    suffix: '-standard'
  }, {
    maxWidth: 300,
    aspect: '1:1',
    suffix: '-square'
  }]
});

// MODELS
const Pet = require('../models/pet');

// PET ROUTES
module.exports = (app) => {

  // INDEX PET => index.js

  // SEARCH PET
  app.get('/search', async (req, res) => {
    try {
      term = new RegExp(req.query.term, 'i')
      const page = req.query.page || 1;
      const results = await Pet.paginate(
        {
          $or: [
            { 'name': term },
            { 'species': term }
          ]
        },
        { page: page }
      )
      res.render('pets-index', { pets: results.docs, pagesCount: results.pages, currentPage: page, term: req.query.term });
    } catch (err) {
      console.log(err.message);
      res.status(500);
    }

  });

  // NEW PET
  app.get('/pets/new', (req, res) => {
    res.render('pets-new');
  });

  // CREATE PET
  app.post('/pets', upload.single('avatar'), async (req, res, next) => {
    let pet = new Pet(req.body);
    if (req.file) {
      // Upload the images
      await client.upload(req.file.path, {}, async function (err, versions, meta) {
        if (err) {
          console.log(err.message)
          return res.status(400).send({ err: err })
        };

        // Pop off the -square and -standard and just use the one URL to grab the image
        for (const image of versions) {
          let urlArray = image.url.split('-');
          urlArray.pop();
          let url = urlArray.join('-');
          pet.avatarUrl = url;
          await pet.save();
        }

        res.send({ pet: pet });
      });
    } else {
      await pet.save();
      res.send({ pet: pet });
    }
  })

  // SHOW PET
  app.get('/pets/:id', (req, res) => {
    try {
      Pet.findById(req.params.id).exec((err, pet) => {
        res.render('pets-show', { pet: pet });
      });
    } catch (err) {
      console.log(err.message)
    }
  });


  // EDIT PET
  app.get('/pets/:id/edit', (req, res) => {
    Pet.findById(req.params.id).exec((err, pet) => {
      res.render('pets-edit', { pet: pet });
    });
  });

  // UPDATE PET
  app.put('/pets/:id', (req, res) => {
    Pet.findByIdAndUpdate(req.params.id, req.body)
      .then((pet) => {
        res.redirect(`/pets/${pet._id}`)
      })
      .catch((err) => {
        // Handle Errors
      });
  });

  // DELETE PET
  app.delete('/pets/:id', (req, res) => {
    Pet.findByIdAndRemove(req.params.id).exec((err, pet) => {
      return res.redirect('/')
    });
  });
}