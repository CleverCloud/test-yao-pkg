import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import fs from 'node:fs';
import mime from 'mime-types';

export class CellarClient {

  #host = 'cellar-c2.services.clever-cloud.com';
  #bucket;
  #client;

  constructor ({ host, bucket, accessKeyId, secretAccessKey }) {
    this.#bucket = bucket;
    this.#client = new S3Client({
      endpoint: 'https://' + this.#host,
      region: 'not-used',
      bucket,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  url (remoteFilepath) {
    return `https://${this.#bucket}.${this.#host}/${remoteFilepath}`;
  }

  async getObject (path) {
    const response = await this.#client.send(new GetObjectCommand({ Bucket: this.#bucket, Key: path }));
    const content = await response.Body.transformToString();
    return JSON.parse(content);
  }

  async exists (remoteFilepath) {
    try {
      await this.#client.send(new HeadObjectCommand({ Bucket: this.#bucket, Key: remoteFilepath }));
      return true;
    }
    catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async upload (filepath, remoteFilepath = filepath) {
    const body = fs.readFileSync(filepath);
    await this.putObject(body, remoteFilepath);
  }

  async putObject (body, remoteFilepath) {
    const contentType = mime.lookup(remoteFilepath) || null;
    await this.#client.send(new PutObjectCommand({
      Bucket: this.#bucket,
      Key: remoteFilepath,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
    }));
  }

  async delete (remoteFilepath) {
    const objects = await this.listObjects(remoteFilepath);
    const promises = objects.map((object) => {
      return this.#client.send(new DeleteObjectCommand({
        Bucket: this.#bucket,
        Key: object.Key,
      }));
    });
    await Promise.all(promises);
  }

  async listObjects (path) {
    const response = await this.#client.send(new ListObjectsCommand({
      Bucket: this.#bucket,
      Prefix: path,
    }));
    return response.Contents || [];
  }
}
