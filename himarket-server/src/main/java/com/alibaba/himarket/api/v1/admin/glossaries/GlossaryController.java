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

package com.alibaba.himarket.api.v1.admin.glossaries;

import com.alibaba.himarket.core.annotation.AdminAuth;
import com.alibaba.himarket.entity.Glossary;
import com.alibaba.himarket.service.GlossaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Glossary Management", description = "Manage glossary entries and alias lookup")
@RestController
@RequestMapping("/api/v1/admin/glossaries")
@Slf4j
@RequiredArgsConstructor
public class GlossaryController {

    private final GlossaryService glossaryService;

    @Operation(summary = "Create glossary entry")
    @PostMapping
    @AdminAuth
    public Glossary createGlossary(@RequestBody Glossary glossary) {
        return glossaryService.createGlossary(glossary);
    }

    @Operation(summary = "List glossary entries")
    @GetMapping
    @AdminAuth
    public List<Glossary> listGlossaries(
            @RequestParam(required = false) String keyword, Pageable pageable) {
        return glossaryService.listGlossaries(keyword, pageable);
    }

    @Operation(summary = "Lookup glossary entries by alias")
    @GetMapping("/lookup")
    @AdminAuth
    public List<Glossary> lookupAlias(@RequestParam String alias) {
        return glossaryService.lookupAlias(alias);
    }

    @Operation(summary = "Get glossary entry")
    @GetMapping("/{glossaryId}")
    @AdminAuth
    public Glossary getGlossary(@PathVariable String glossaryId) {
        return glossaryService.getGlossary(glossaryId);
    }

    @Operation(summary = "Update glossary entry")
    @PutMapping("/{glossaryId}")
    @AdminAuth
    public Glossary updateGlossary(
            @PathVariable String glossaryId, @RequestBody Glossary glossary) {
        return glossaryService.updateGlossary(glossaryId, glossary);
    }

    @Operation(summary = "Delete glossary entry")
    @DeleteMapping("/{glossaryId}")
    @AdminAuth
    public void deleteGlossary(@PathVariable String glossaryId) {
        glossaryService.deleteGlossary(glossaryId);
    }
}
