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

import cn.hutool.core.util.StrUtil;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.core.utils.IdGenerator;
import com.alibaba.himarket.entity.Glossary;
import com.alibaba.himarket.repository.GlossaryRepository;
import jakarta.transaction.Transactional;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class GlossaryService {

    private static final String RESOURCE_NAME = "Glossary";

    private final GlossaryRepository glossaryRepository;

    /**
     * Create a glossary entry.
     *
     * @param request the glossary entry to create
     * @return created glossary entry
     */
    public Glossary createGlossary(Glossary request) {
        validateTerm(request);
        glossaryRepository
                .findByTermIgnoreCase(request.getTerm().trim())
                .ifPresent(
                        glossary -> {
                            throw new BusinessException(
                                    ErrorCode.CONFLICT,
                                    StrUtil.format(
                                            "Glossary term '{}' already exists",
                                            glossary.getTerm()));
                        });

        Glossary glossary =
                Glossary.builder()
                        .id(IdGenerator.genIdWithPrefix("glossary-"))
                        .term(request.getTerm().trim())
                        .translation(trimToNull(request.getTranslation()))
                        .aliases(cleanAliases(request.getAliases()))
                        .description(trimToNull(request.getDescription()))
                        .enabled(Optional.ofNullable(request.getEnabled()).orElse(Boolean.TRUE))
                        .build();

        return glossaryRepository.save(glossary);
    }

    /**
     * List glossary entries with optional keyword matching.
     *
     * @param keyword optional term or translation keyword
     * @param pageable pagination settings
     * @return matching glossary entries
     */
    public List<Glossary> listGlossaries(String keyword, Pageable pageable) {
        if (StrUtil.isBlank(keyword)) {
            return glossaryRepository.findAll(pageable).getContent();
        }
        return glossaryRepository.findByTermContainingIgnoreCaseOrTranslationContainingIgnoreCase(
                keyword, keyword);
    }

    /**
     * Get a glossary entry by ID.
     *
     * @param glossaryId glossary ID
     * @return glossary entry
     */
    public Glossary getGlossary(String glossaryId) {
        return findGlossary(glossaryId);
    }

    /**
     * Update a glossary entry.
     *
     * @param glossaryId glossary ID
     * @param request update payload
     * @return updated glossary entry
     */
    public Glossary updateGlossary(String glossaryId, Glossary request) {
        Glossary glossary = findGlossary(glossaryId);
        validateTerm(request);

        String requestedTerm = request.getTerm().trim();
        if (!glossary.getTerm().equalsIgnoreCase(requestedTerm)) {
            glossaryRepository
                    .findByTermIgnoreCase(requestedTerm)
                    .ifPresent(
                            existed -> {
                                throw new BusinessException(
                                        ErrorCode.CONFLICT,
                                        StrUtil.format(
                                                "Glossary term '{}' already exists",
                                                existed.getTerm()));
                            });
        }

        glossary.setTerm(requestedTerm);
        glossary.setTranslation(trimToNull(request.getTranslation()));
        glossary.setAliases(cleanAliases(request.getAliases()));
        glossary.setDescription(trimToNull(request.getDescription()));
        glossary.setEnabled(Optional.ofNullable(request.getEnabled()).orElse(Boolean.TRUE));

        return glossaryRepository.saveAndFlush(glossary);
    }

    /**
     * Delete a glossary entry.
     *
     * @param glossaryId glossary ID
     */
    public void deleteGlossary(String glossaryId) {
        glossaryRepository.delete(findGlossary(glossaryId));
    }

    /**
     * Lookup glossary entries by term, translation, or alias in both directions.
     *
     * @param alias term, translation, or alias text
     * @return matching glossary entries
     */
    public List<Glossary> lookupAlias(String alias) {
        if (StrUtil.isBlank(alias)) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "alias cannot be blank");
        }

        String normalizedAlias = normalize(alias);
        return glossaryRepository.findByEnabledTrue().stream()
                .filter(glossary -> matchesGlossary(glossary, normalizedAlias))
                .collect(Collectors.toList());
    }

    private Glossary findGlossary(String glossaryId) {
        return glossaryRepository
                .findById(glossaryId)
                .orElseThrow(
                        () ->
                                new BusinessException(
                                        ErrorCode.NOT_FOUND, RESOURCE_NAME, glossaryId));
    }

    private void validateTerm(Glossary glossary) {
        if (glossary == null || StrUtil.isBlank(glossary.getTerm())) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "term cannot be blank");
        }
    }

    private boolean matchesGlossary(Glossary glossary, String normalizedAlias) {
        return aliasCandidates(glossary)
                .map(GlossaryService::normalize)
                .anyMatch(normalizedAlias::equals);
    }

    private Stream<String> aliasCandidates(Glossary glossary) {
        Stream<String> coreTerms = Stream.of(glossary.getTerm(), glossary.getTranslation());
        Stream<String> aliases =
                Optional.ofNullable(glossary.getAliases()).orElse(Collections.emptyList()).stream();
        return Stream.concat(coreTerms, aliases).filter(StrUtil::isNotBlank);
    }

    private List<String> cleanAliases(List<String> aliases) {
        if (aliases == null) {
            return Collections.emptyList();
        }
        return aliases.stream()
                .filter(StrUtil::isNotBlank)
                .map(String::trim)
                .distinct()
                .collect(Collectors.toList());
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String normalize(String value) {
        return Objects.toString(value, "").trim().toLowerCase(Locale.ROOT);
    }
}
