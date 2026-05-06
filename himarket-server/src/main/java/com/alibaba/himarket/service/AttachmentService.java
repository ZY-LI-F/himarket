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

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.core.utils.FileUploadValidator;
import com.alibaba.himarket.entity.Attachment;
import com.alibaba.himarket.repository.AttachmentRepository;
import com.alibaba.himarket.storage.AttachmentObjectStorage;
import com.alibaba.himarket.storage.AttachmentObjectStorage.StoredObject;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AttachmentService {

    public static final long MAX_UPLOAD_SIZE_BYTES = 100L * 1024 * 1024;
    public static final Duration SIGNED_URL_TTL = Duration.ofMinutes(5);

    private static final String OBJECT_NAME_PREFIX = "attachments/";

    private final AttachmentRepository attachmentRepository;
    private final AttachmentObjectStorage objectStorage;

    public AttachmentUploadResult upload(MultipartFile file) {
        validateUpload(file);

        String attachmentId = UUID.randomUUID().toString();
        String name = FileUploadValidator.sanitizeFilename(file.getOriginalFilename());
        String contentType = normalizeContentType(file.getContentType());
        String objectName = buildObjectName(attachmentId, name);
        StoredObject storedObject = uploadToObjectStorage(file, objectName, contentType);

        return attachmentRepository
                .findBySha256(storedObject.sha256())
                .map(existing -> deduplicate(storedObject.objectName(), existing))
                .orElseGet(
                        () ->
                                saveNewAttachment(
                                        attachmentId,
                                        name,
                                        contentType,
                                        file.getSize(),
                                        storedObject));
    }

    public List<AttachmentSummary> list() {
        return attachmentRepository.findAll().stream().map(AttachmentSummary::from).toList();
    }

    public AttachmentSignedUrlResult createSignedDownloadUrl(String attachmentId) {
        Attachment attachment = findAttachment(attachmentId);
        return new AttachmentSignedUrlResult(
                attachment.getAttachmentId(),
                createSignedUrl(attachment.getObjectName()),
                SIGNED_URL_TTL.toSeconds());
    }

    private AttachmentUploadResult saveNewAttachment(
            String attachmentId,
            String name,
            String contentType,
            long size,
            StoredObject storedObject) {
        Attachment attachment =
                Attachment.builder()
                        .attachmentId(attachmentId)
                        .name(name)
                        .contentType(contentType)
                        .sizeBytes(size)
                        .sha256(storedObject.sha256())
                        .objectName(storedObject.objectName())
                        .build();
        try {
            return toUploadResult(attachmentRepository.save(attachment), false);
        } catch (DataIntegrityViolationException e) {
            return handleConcurrentDuplicate(storedObject, e);
        } catch (RuntimeException e) {
            deleteObjectAfterFailedSave(storedObject.objectName(), e);
            throw e;
        }
    }

    private AttachmentUploadResult handleConcurrentDuplicate(
            StoredObject storedObject, DataIntegrityViolationException cause) {
        return attachmentRepository
                .findBySha256(storedObject.sha256())
                .map(existing -> deduplicate(storedObject.objectName(), existing))
                .orElseThrow(() -> cause);
    }

    private AttachmentUploadResult deduplicate(String duplicateObjectName, Attachment existing) {
        deleteDuplicateObject(duplicateObjectName);
        return toUploadResult(existing, true);
    }

    private AttachmentUploadResult toUploadResult(Attachment attachment, boolean deduplicated) {
        return new AttachmentUploadResult(
                attachment.getAttachmentId(),
                attachment.getName(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getSha256(),
                createSignedUrl(attachment.getObjectName()),
                SIGNED_URL_TTL.toSeconds(),
                deduplicated);
    }

    private Attachment findAttachment(String attachmentId) {
        return attachmentRepository
                .findByAttachmentId(attachmentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, attachmentId));
    }

    private StoredObject uploadToObjectStorage(
            MultipartFile file, String objectName, String contentType) {
        try (InputStream inputStream = file.getInputStream()) {
            return objectStorage.upload(objectName, inputStream, file.getSize(), contentType);
        } catch (IOException e) {
            throw new BusinessException(
                    ErrorCode.INTERNAL_ERROR, e, "Failed to upload attachment to object storage");
        }
    }

    private String createSignedUrl(String objectName) {
        try {
            return objectStorage.createSignedGetUrl(objectName, SIGNED_URL_TTL);
        } catch (IOException e) {
            throw new BusinessException(
                    ErrorCode.INTERNAL_ERROR, e, "Failed to create attachment signed URL");
        }
    }

    private void deleteDuplicateObject(String objectName) {
        try {
            objectStorage.delete(objectName);
        } catch (IOException e) {
            throw new BusinessException(
                    ErrorCode.INTERNAL_ERROR, e, "Failed to delete duplicate attachment object");
        }
    }

    private void deleteObjectAfterFailedSave(String objectName, RuntimeException cause) {
        try {
            objectStorage.delete(objectName);
        } catch (IOException e) {
            cause.addSuppressed(e);
        }
    }

    private static void validateUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "File cannot be empty");
        }
        if (file.getSize() > MAX_UPLOAD_SIZE_BYTES) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "File size exceeds 100MB limit");
        }
    }

    private static String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
        return contentType;
    }

    private static String buildObjectName(String attachmentId, String name) {
        int dotIndex = name.lastIndexOf('.');
        String extension =
                dotIndex >= 0 && dotIndex < name.length() - 1
                        ? name.substring(dotIndex).toLowerCase(Locale.ROOT)
                        : "";
        return OBJECT_NAME_PREFIX + attachmentId + extension;
    }

    public record AttachmentUploadResult(
            String attachmentId,
            String name,
            String contentType,
            long size,
            String sha256,
            String signedUrl,
            long signedUrlTtlSeconds,
            boolean deduplicated) {}

    public record AttachmentSignedUrlResult(
            String attachmentId, String signedUrl, long signedUrlTtlSeconds) {}

    public record AttachmentSummary(
            String attachmentId,
            String name,
            String contentType,
            long size,
            String sha256,
            String createdAt) {

        static AttachmentSummary from(Attachment attachment) {
            return new AttachmentSummary(
                    attachment.getAttachmentId(),
                    attachment.getName(),
                    attachment.getContentType(),
                    attachment.getSizeBytes(),
                    attachment.getSha256(),
                    attachment.getCreateAt() == null ? null : attachment.getCreateAt().toString());
        }
    }
}
