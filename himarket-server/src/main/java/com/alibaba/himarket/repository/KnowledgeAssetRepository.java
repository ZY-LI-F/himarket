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

package com.alibaba.himarket.repository;

import com.alibaba.himarket.entity.KnowledgeAsset;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface KnowledgeAssetRepository extends BaseRepository<KnowledgeAsset, String> {

    List<KnowledgeAsset> findByScopeAndCategory(String scope, String category);

    List<KnowledgeAsset> findByScopeAndCategoryAndEnabledTrueAndDeletedAtIsNull(
            String scope, String category);

    Optional<KnowledgeAsset> findByScopeAndTeamIdAndUserIdAndNameAndCategory(
            String scope, String teamId, String userId, String name, String category);

    List<KnowledgeAsset> findByOwnerIdAndEnabledTrueAndDeletedAtIsNull(String ownerId);

    List<KnowledgeAsset> findByInheritsFrom(String inheritsFrom);

    List<KnowledgeAsset> findBySyncPendingTrue();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select asset from KnowledgeAsset asset where asset.id = :id")
    Optional<KnowledgeAsset> findByIdForUpdate(@Param("id") String id);
}
