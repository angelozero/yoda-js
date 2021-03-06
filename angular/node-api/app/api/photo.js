const https = require('https');
const htmlToText = require('html-to-text');

const { PhotoDao, UserDao } = require('../infra')
  , jimp = require('jimp')
  , path = require('path')
  , fs = require('fs')
  , unlink = require('util').promisify(fs.unlink);

const api = {}

const userCanDelete = user => photo => photo.userId == user.id;

const defaultExtension = '.jpg';

api.list = async (req, res) => {
  const { userName } = req.params;
  const { page } = req.query;
  const user = await new UserDao(req.db).findByName(userName);
  if (user) {
    console.log(`Listing photos`);
    const photos = await new PhotoDao(req.db)
      .listAllFromUser(userName, page);
    res.json(photos);
  } else {
    res.status(404).json({ message: 'User not found' });
  }

}

api.add = async (req, res) => {
  console.log('Received JSON data', req.body);
  const photo = req.body;
  photo.file = '';
  const id = await new PhotoDao(req.db).add(photo, req.user.id);
  res.json(id);
};

api.addUpload = async (req, res) => {

  console.log('\nupload complete');
  console.log('Photo data', req.body);
  console.log('File info\n', req.file);

  const image = await jimp.read(req.file.path);

  await image
    .exifRotate()
    .cover(460, 460)
    .autocrop()
    .write(req.file.path);

  const photo = req.body;
  photo.url = path.basename(req.file.path);
  await new PhotoDao(req.db).add(photo, req.user.id);
  res.status(200).end();
};

api.findById = async (req, res) => {
  const { photoId } = req.params;
  console.log(`Finding photo for ID ${photoId}`)
  const photo = await new PhotoDao(req.db).findById(photoId);
  if (photo) {
    res.json(photo);
  } else {
    res.status(404).json({ message: 'Photo does not exist' })
  }
};

api.remove = async (req, res) => {
  const user = req.user;
  const { photoId } = req.params;
  const dao = new PhotoDao(req.db);
  const photo = await dao.findById(photoId);
  if (!photo) {
    const message = 'Photo does not exist';
    console.log(message);
    return res.status(404).json({ message });
  }

  if (userCanDelete(user)(photo)) {
    await dao.remove(photoId)
    console.log(`Photo ${photoId} deleted!`);
    res.status(200).end();
  } else {
    console.log(`
            Forbiden operation. User ${user.id} 
            can delete photo from user ${photo.userId}
        `);
    res.status(403).json({ message: 'Forbidden' });
  }
};

api.like = async (req, res) => {
  const { photoId } = req.params;
  const dao = new PhotoDao(req.db);
  const liked = await dao.likeById(photoId, req.user.id);
  if (liked) {
    console.log(`User ${req.user.name} liked photo ${photoId}`);
    return res.status(201).end();
  }
  return res.status(304).end();
};

api.findAllPhotos = async (req, res) => {

  let catStatusImageData = await new PhotoDao(req.db).findAllPhotos();

  return res.status(200).json({
    message: '200 OK', body: catStatusImageData
  });
}

api.saveAllCaStatusImages = async (req, res) => {
  const photoDao = new PhotoDao(req.db);
  const isPhotoInfo = await photoDao.isPhotoInfo();

  if (isPhotoInfo.data === 0) {

    const user = await photoDao.findUser();

    https.get('https://http.cat/', (resp) => {
      let data = '';

      resp.on('data', (chunk) => {
        data += chunk;
      });

      resp.on('end', () => {

        const text = htmlToText.fromString(data.toString(), {
          baseElement: 'body'
        });

        let catStatusImageList = text.match(/\*([^\]]*)\[/g).toString()
          .replace(/\*/g, '')
          .replace(/\[/g, '')
          .replace(/\,/g, '')
          .split("  ")

        for (var x = 0; x < catStatusImageList.length; x++) {
          var catStatusImageInfo = catStatusImageList[x].replace(/(\d{3})/g, '$1 ').replace(/(^\s+|\s+$)/, '')
          photoDao.add({ url: `https://http.cat/images/${catStatusImageInfo.substring(0, 3)}.jpg`, description: catStatusImageInfo, allowComments: true }, user.user_id)
          catStatusImageList[x] = catStatusImageInfo
        }

        photoDao.setPhotoInfo(1, isPhotoInfo.data);

        return res.status(200).json({
          message: 'images saved with success'/*, data: catStatusImageList*/
        });
      });
    }).on("error", (err) => {
      console.log("Error: " + err.message);
      return res.status(403).json({ message: 'Response not found' });
    });

  } else {
    return res.status(200).json({
      message: 'Nothing to update or save'
    });
  }
}

api.deletePhotoTable = async (req, res) => {
  const dao = new PhotoDao(req.db);
  const photoInfo = await dao.isPhotoInfo();

  dao.deleteAllPhotos();
  dao.setPhotoInfo(0, photoInfo.data);

  return res.status(200).json({
    message: 'All photos deleted with success'
  });
};

module.exports = api;