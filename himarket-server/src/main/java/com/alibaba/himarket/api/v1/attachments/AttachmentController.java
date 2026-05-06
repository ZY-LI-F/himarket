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

package com.alibaba.himarket.api.v1.attachments;

import com.alibaba.himarket.core.annotation.AdminOrDeveloperAuth;
import com.alibaba.himarket.service.AttachmentService;
import com.alibaba.himarket.service.AttachmentService.AttachmentSignedUrlResult;
import com.alibaba.himarket.service.AttachmentService.AttachmentSummary;
import com.alibaba.himarket.service.AttachmentService.AttachmentUploadResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "附件管理 V1", description = "提供附件流式上传、sha256 去重和临时下载链接")
@RestController
@RequestMapping("/api/v1/attachments")
@RequiredArgsConstructor
@AdminOrDeveloperAuth
public class AttachmentController {

    private final AttachmentService attachmentService;

    @Operation(summary = "列出附件（v1 共享视图，owner filter 待 v2）")
    @GetMapping
    public List<AttachmentSummary> list() {
        return attachmentService.list();
    }

    @Operation(summary = "上传附件")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AttachmentUploadResult upload(@RequestParam("file") MultipartFile file) {
        return attachmentService.upload(file);
    }

    @Operation(summary = "获取附件下载 signed URL")
    @GetMapping("/{attachmentId}/signed-url")
    public AttachmentSignedUrlResult createSignedDownloadUrl(@PathVariable String attachmentId) {
        return attachmentService.createSignedDownloadUrl(attachmentId);
    }
}
