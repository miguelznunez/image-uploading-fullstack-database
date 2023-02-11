const express = require("express")
const multer  = require("multer")
const path = require("path")

const multerS3 = require("multer-s3-v2")
const {s3, getImageStream, deleteImage} = require("./s3.js")
const {dbConnection} = require("./db.js")
require("dotenv").config()

const storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME,
  metadata: function(req, file, cb) {
    cb(null, { originalname: file.originalname });
  },
  key: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

function checkFileType(file, cb){
  const filetypes = /jpeg|png|jpg/
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = filetypes.test(file.mimetype)

  if(mimetype && extname){
    return cb(null,true)
  } else {
    cb("Please upload images only")
  }
}

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 1000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb)
  }
}).any()

const port = process.env.PORT || 3000;

const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: false}))

app.set("view engine", "ejs")

app.use(express.static("public"))

app.get("/", (req, res) => {
  dbConnection.query("SELECT * FROM images WHERE user_id = ?", [1], (err, result) => {
    if(!err) res.render("index", { images: result})
    else throw new Error(err)
  })
  
})

app.post("/upload", (req, res) => {
  upload(req, res, (err) => {
    if(!err && req.files != "") { 
      saveImagesInDB(req.files)
      res.status(200).send()
    } else if (!err && req.files == ""){
      res.statusMessage = "Please select an image to upload";
      res.status(400).end()
    } else {
      res.statusMessage = (err === "Please upload images only" ? err : "Photo exceeds limit of 1MB") ;
      res.status(400).end()
    }
  })  
})

app.put("/delete", (req, res) => {
  const deleteImages = req.body.deleteImages

  if(deleteImages == ""){
    res.statusMessage = "Please select an image to delete";
    res.status(400).end()
  } else {
    deleteImagesFromS3(deleteImages)
    deleteImagesFromDb(deleteImages)
    res.statusMessage = "Succesfully deleted";
    res.status(200).end()
  }
})

app.get("/:image_key", (req, res) => {
  const readStream = getImageStream(req.params.image_key)
  readStream.pipe(res)
})

function saveImagesInDB(images){
  for(let i = 0;i < images.length;i++){
    dbConnection.query("INSERT INTO images (user_id, image_key) VALUES(?,?)", [1,images[i].key], (err, result) => {
      if(err) throw new Error(err)
    })
  }
}

function deleteImagesFromS3(images){
  for(let i = 0; i < images.length;i++){
    deleteImage(images[i])
  }
}

function deleteImagesFromDb(images){
  for(let i = 0; i < images.length;i++){
    dbConnection.query("DELETE FROM images WHERE user_id = ? AND image_key = ?", [1, images[i]], (err, result) => {
      if(err) throw new Error(err)
    })
  }
}

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
