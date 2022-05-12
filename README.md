# Nextcloud Chunk File Upload
Upload files to Nextcloud using chunks

Nextcloud offers a chunked upload library, which makes your life a lot easier, if you want to upload large files to
your Nextcloud instance over a bad network.

Use this library if you want to build some sort of upload client in node.js and do that with the joy of Promises 🙌.

## Installation
This package is published on NPM so you can simply type:
```
npm install --save nextcloud-chunk-file-upload
```
or
```
yarn add nextcloud-chunk-file-upload
```

## Usage
### Upload
The core part of this library is a class called `Upload`, which takes care of server parameters, like the server's
address and your credentials. If you want to start an upload, call ``uploadFile``.
The return value of this method is Promise, indicating the success or failure of the upload process.

#### Methods
**constructor(url, userspace, username, password)**

|Name     |Required|Type  |Default|Description                                                            |
|---------|--------|------|-------|-----------------------------------------------------------------------|
|url      |yes     |string|       |URL to WebDav API                                                      |
|userspace|yes     |string|       |User key on the filesystem on the server (usually the same as username)|
|username |yes     |string|       |Credentials: Username                                                  |
|password |yes     |string|       |Credentials: Password                                                  |

**uploadFile(localPath, remotePath, chunkSize, retryChunks): Promise&lt;Event&gt;**

|Name       |Required|Type  |Default|Description                                   |
|-----------|--------|------|-------|----------------------------------------------|
|localPath  |yes     |string|       |Path of file on local machine                 |
|remotePath |yes     |string|       |Path the file should be placed on the server  |
|chunkSize  |no      |number|2MB    |The max size of chunks in bytes               |
|retryChunks|no      |number|5      |Number of retry attempts for uploading a chunk|

### Event
`Upload.uploadFile` returns a promise containing an event object. This object holds information about the result of the
upload.

#### Member variables
|Name    |Type   |Description                         |
|--------|-------|------------------------------------|
|filename|string |Local file path                     |
|chunkNo |number |Sequence number of the current chunk|
|message |string |Event reason                        |
|complete|boolean|Whether the upload was successful   |

#### Methods
**toString(): string**

Returns a string containg the event data
 

### Example
A simple upload code could look like this:
```javascript
const Upload = require('nextcloud-chunk-file-upload');

const upload = new Upload('https://example.com/remote.php/dav', 'myuser', 'myspace', 'secret');

upload.uploadFile('/path/to/localfile.jpg', '/path/to/remotefile.jpg')
  .then(event => {
    console.log('Success!');
    console.log(event.toString());
  })
  .catch(event => {
    console.error('Sth. went wrong')
    console.error(event.toString());
  });
```

## License
This project is licensed under the MIT license. See LICENSE file.
