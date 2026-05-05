/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package com.alibaba.himarket.storage;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.http.Method;
import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class MinioSignedUrlSigner implements AttachmentObjectStorage {

    private final String endpoint;
    private final String accessKey;
    private final String secretKey;
    private final String bucket;
    private final String region;
    private volatile MinioClient minioClient;

    public MinioSignedUrlSigner(
            @Value("${attachment.minio.endpoint:}") String endpoint,
            @Value("${attachment.minio.access-key:}") String accessKey,
            @Value("${attachment.minio.secret-key:}") String secretKey,
            @Value("${attachment.minio.bucket:himarket-attachments}") String bucket,
            @Value("${attachment.minio.region:}") String region) {
        this.endpoint = endpoint;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.bucket = bucket;
        this.region = region;
    }

    @Override
    public StoredObject upload(
            String objectName, InputStream inputStream, long size, String contentType)
            throws IOException {
        MessageDigest digest = sha256Digest();
        try (DigestInputStream digestInputStream = new DigestInputStream(inputStream, digest)) {
            client().putObject(
                            PutObjectArgs.builder().bucket(bucket).object(objectName).stream(
                                            digestInputStream, size, -1)
                                    .contentType(contentType)
                                    .build());
            return new StoredObject(objectName, HexFormat.of().formatHex(digest.digest()));
        } catch (Exception e) {
            throw asIOException("Failed to upload object to MinIO: " + objectName, e);
        }
    }

    @Override
    public String createSignedGetUrl(String objectName, Duration ttl) throws IOException {
        try {
            return client().getPresignedObjectUrl(
                            GetPresignedObjectUrlArgs.builder()
                                    .method(Method.GET)
                                    .bucket(bucket)
                                    .object(objectName)
                                    .expiry(Math.toIntExact(ttl.getSeconds()), TimeUnit.SECONDS)
                                    .build());
        } catch (Exception e) {
            throw asIOException("Failed to create signed URL for object: " + objectName, e);
        }
    }

    @Override
    public void delete(String objectName) throws IOException {
        try {
            client().removeObject(
                            RemoveObjectArgs.builder().bucket(bucket).object(objectName).build());
        } catch (Exception e) {
            throw asIOException("Failed to delete object from MinIO: " + objectName, e);
        }
    }

    private MinioClient client() {
        MinioClient existing = minioClient;
        if (existing != null) {
            return existing;
        }
        synchronized (this) {
            if (minioClient == null) {
                validateConfiguration();
                MinioClient.Builder builder =
                        MinioClient.builder().endpoint(endpoint).credentials(accessKey, secretKey);
                if (StringUtils.hasText(region)) {
                    builder.region(region);
                }
                minioClient = builder.build();
            }
            return minioClient;
        }
    }

    private void validateConfiguration() {
        if (!StringUtils.hasText(endpoint)
                || !StringUtils.hasText(accessKey)
                || !StringUtils.hasText(secretKey)
                || !StringUtils.hasText(bucket)) {
            throw new IllegalStateException(
                    "MinIO attachment storage is not configured: endpoint, access-key,"
                            + " secret-key, and bucket are required");
        }
    }

    private static MessageDigest sha256Digest() throws IOException {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IOException("SHA-256 digest is not available", e);
        }
    }

    private static IOException asIOException(String message, Exception e) {
        if (e instanceof IOException ioException) {
            return new IOException(message, ioException);
        }
        return new IOException(message, e);
    }
}
