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

package com.alibaba.himarket.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.entity.Attachment;
import com.alibaba.himarket.repository.AttachmentRepository;
import com.alibaba.himarket.service.AttachmentService.AttachmentSignedUrlResult;
import com.alibaba.himarket.service.AttachmentService.AttachmentUploadResult;
import com.alibaba.himarket.storage.AttachmentObjectStorage;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

class AttachmentServiceTest {

    @Test
    void sameFileUploadedTwiceReturnsExistingAttachmentAndDeletesDuplicateObject() {
        RepositoryFixture repository = repositoryFixture();
        CapturingObjectStorage objectStorage = new CapturingObjectStorage();
        AttachmentService service = new AttachmentService(repository.repository(), objectStorage);
        byte[] content = "same attachment content".getBytes();

        AttachmentUploadResult first =
                service.upload(new MockMultipartFile("file", "same.txt", "text/plain", content));
        AttachmentUploadResult second =
                service.upload(new MockMultipartFile("file", "same.txt", "text/plain", content));

        assertFalse(first.deduplicated());
        assertTrue(second.deduplicated());
        assertEquals(first.attachmentId(), second.attachmentId());
        assertEquals(first.sha256(), second.sha256());
        assertEquals(1, repository.savedTotal());
        assertEquals(2, objectStorage.uploadedObjectNames().size());
        assertEquals(1, objectStorage.deletedObjectNames().size());
        assertEquals(
                objectStorage.uploadedObjectNames().get(1),
                objectStorage.deletedObjectNames().get(0));
    }

    @Test
    void signedUrlUsesFiveMinuteTtl() {
        RepositoryFixture repository = repositoryFixture();
        CapturingObjectStorage objectStorage = new CapturingObjectStorage();
        AttachmentService service = new AttachmentService(repository.repository(), objectStorage);

        AttachmentUploadResult uploadResult =
                service.upload(
                        new MockMultipartFile("file", "demo.txt", "text/plain", "demo".getBytes()));
        AttachmentSignedUrlResult signedUrl =
                service.createSignedDownloadUrl(uploadResult.attachmentId());

        assertEquals(300L, uploadResult.signedUrlTtlSeconds());
        assertEquals(300L, signedUrl.signedUrlTtlSeconds());
        assertEquals(Duration.ofMinutes(5), objectStorage.lastTtl());
        assertTrue(signedUrl.signedUrl().contains("ttl=300"));
    }

    @Test
    void uploadOverOneHundredMbIsRejectedBeforeStorageWrite() {
        RepositoryFixture repository = repositoryFixture();
        CapturingObjectStorage objectStorage = new CapturingObjectStorage();
        AttachmentService service = new AttachmentService(repository.repository(), objectStorage);
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(AttachmentService.MAX_UPLOAD_SIZE_BYTES + 1);
        when(file.getOriginalFilename()).thenReturn("large.bin");

        assertThrows(BusinessException.class, () -> service.upload(file));
        assertEquals(0, objectStorage.uploadedObjectNames().size());
        assertEquals(0, repository.savedTotal());
    }

    private static RepositoryFixture repositoryFixture() {
        AttachmentRepository repository = mock(AttachmentRepository.class);
        Map<String, Attachment> byAttachmentId = new HashMap<>();
        Map<String, Attachment> bySha256 = new HashMap<>();
        AtomicInteger savedCount = new AtomicInteger();

        when(repository.findByAttachmentId(any()))
                .thenAnswer(
                        invocation ->
                                Optional.ofNullable(byAttachmentId.get(invocation.getArgument(0))));
        when(repository.findBySha256(any()))
                .thenAnswer(
                        invocation -> Optional.ofNullable(bySha256.get(invocation.getArgument(0))));
        when(repository.save(any(Attachment.class)))
                .thenAnswer(
                        invocation -> {
                            Attachment entity = invocation.getArgument(0);
                            savedCount.incrementAndGet();
                            byAttachmentId.put(entity.getAttachmentId(), entity);
                            bySha256.put(entity.getSha256(), entity);
                            return entity;
                        });

        return new RepositoryFixture(repository, savedCount);
    }

    private record RepositoryFixture(AttachmentRepository repository, AtomicInteger savedCount) {

        public int savedTotal() {
            return savedCount.get();
        }
    }

    private static final class CapturingObjectStorage implements AttachmentObjectStorage {

        private final List<String> uploadedObjectNames = new ArrayList<>();
        private final List<String> deletedObjectNames = new ArrayList<>();
        private Duration lastTtl;

        @Override
        public StoredObject upload(
                String objectName, InputStream inputStream, long size, String contentType)
                throws IOException {
            uploadedObjectNames.add(objectName);
            return new StoredObject(objectName, sha256(inputStream));
        }

        @Override
        public String createSignedGetUrl(String objectName, Duration ttl) {
            lastTtl = ttl;
            return "https://minio.test/" + objectName + "?ttl=" + ttl.toSeconds();
        }

        @Override
        public void delete(String objectName) {
            deletedObjectNames.add(objectName);
        }

        List<String> uploadedObjectNames() {
            return uploadedObjectNames;
        }

        List<String> deletedObjectNames() {
            return deletedObjectNames;
        }

        Duration lastTtl() {
            return lastTtl;
        }

        private static String sha256(InputStream inputStream) throws IOException {
            MessageDigest digest;
            try {
                digest = MessageDigest.getInstance("SHA-256");
            } catch (NoSuchAlgorithmException e) {
                throw new IOException("SHA-256 digest is not available", e);
            }
            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            return HexFormat.of().formatHex(digest.digest());
        }
    }
}
