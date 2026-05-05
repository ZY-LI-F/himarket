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

package com.alibaba.himarket.scheduler;

import com.alibaba.himarket.service.KnowledgeSyncService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class SyncRetryScheduler {

    private final KnowledgeSyncService syncService;

    public SyncRetryScheduler(KnowledgeSyncService syncService) {
        this.syncService = syncService;
    }

    @Scheduled(
            fixedDelayString = "${himarket.knowledge.sync.retry-delay-ms:300000}",
            initialDelayString = "${himarket.knowledge.sync.retry-initial-delay-ms:30000}")
    public void retryPendingKnowledgeSync() {
        int synced = syncService.retryPending();
        if (synced > 0) {
            log.info("Retried pending knowledge sync, synced={} assets", synced);
        }
    }
}
