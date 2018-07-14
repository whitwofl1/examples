// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

let cloud = require("@pulumi/cloud-aws");
let ml = require("./machinelearning");

// A bucket to store videos and thumbnails.
let bucket = new cloud.Bucket("bucket");

// A task which extracts a thumbnail using a containerized FFMPEG job.
let ffmpegThumbnailTask = new cloud.Task("ffmpegThumbTask", {
    build: "./docker-ffmpeg-thumb",
    memoryReservation: 512,
});

// An ML-based video labeling service.
let videoProcessor = new ml.VideoLabelProcessor("mlvlp");

// When a new video is uploaded, start ML-driven label detection.
let bucketName = bucket.bucket.id;
bucket.onPut("onNewVideo", async (bucketArgs) => {
    console.log(`*** New video: file ${bucketArgs.key} was uploaded at ${bucketArgs.eventTime}.`);
    videoProcessor.startRekognitionJob(bucketName.get(), bucketArgs.key);
}, { keySuffix: ".mp4" });  // run this Lambda only on .mp4 files

// When video processing is complete, run the FFMPEG task on the video,
// using the timestamp with the highest confidence for the label "cat".
videoProcessor.onLabelResult("cat", async (file, framePos) => {
    console.log(`*** Rekognition processing complete for ${bucketName.get()}/${file} at timestamp ${framePos}`);
    await ffmpegThumbnailTask.run({
        environment: {
            "S3_BUCKET":   bucketName.get(),
            "INPUT_VIDEO": file,
            "TIME_OFFSET": framePos,
            "OUTPUT_FILE": file.substring(0, file.lastIndexOf('.')) + '.jpg',
        },
    });
    console.log(`*** Launched thumbnailer task.`);
});

// After the thumbnail is created, log a message.
bucket.onPut("onNewThumbnail", async (bucketArgs) => {
    console.log(`*** New thumbnail: file ${bucketArgs.key} was saved at ${bucketArgs.eventTime}.`);
}, { keySuffix: ".jpg" });

// Export the bucket name.
exports.bucketName = bucketName;
