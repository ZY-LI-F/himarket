package com.alibaba.himarket.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.alibaba.himarket.entity.IchTemplate;
import com.alibaba.himarket.repository.IchTemplateRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

class IchTemplateSeederTest {

    @Test
    void seedsAllBaselineSpecsAndKeepsUniqueKeyIdempotent() throws Exception {
        Map<String, IchTemplate> store = new LinkedHashMap<>();
        IchTemplateRepository repository = mock(IchTemplateRepository.class);
        when(repository.findBySpecAndVersionAndSectionPath(anyString(), anyString(), anyString()))
                .thenAnswer(
                        invocation ->
                                Optional.ofNullable(
                                        store.get(
                                                key(
                                                        invocation.getArgument(0),
                                                        invocation.getArgument(1),
                                                        invocation.getArgument(2)))));
        when(repository.save(any(IchTemplate.class)))
                .thenAnswer(
                        invocation -> {
                            IchTemplate template = invocation.getArgument(0);
                            store.put(
                                    key(
                                            template.getSpec(),
                                            template.getVersion(),
                                            template.getSectionPath()),
                                    template);
                            return template;
                        });

        IchTemplateSeeder seeder =
                new IchTemplateSeeder(repository, new PathMatchingResourcePatternResolver());

        int firstSeeded = seeder.seedTemplates();
        int sizeAfterFirstSeed = store.size();
        int secondSeeded = seeder.seedTemplates();

        assertEquals(firstSeeded, secondSeeded);
        assertEquals(sizeAfterFirstSeed, store.size());
        assertEquals(firstSeeded, store.size());

        Map<String, Long> countsBySpec =
                store.values().stream()
                        .collect(
                                Collectors.groupingBy(
                                        IchTemplate::getSpec,
                                        LinkedHashMap::new,
                                        Collectors.counting()));

        assertTrue(countsBySpec.getOrDefault("ICH-E2A", 0L) > 0);
        assertEquals(16L, countsBySpec.getOrDefault("ICH-E3", 0L));
        assertTrue(countsBySpec.getOrDefault("ICH-E6(R3)", 0L) > 0);
        assertTrue(countsBySpec.getOrDefault("ICH-E8(R1)", 0L) > 0);
        assertTrue(countsBySpec.getOrDefault("ICH-E9", 0L) > 0);
        assertTrue(store.values().stream().allMatch(template -> !template.getOutline().isBlank()));
    }

    private String key(String spec, String version, String sectionPath) {
        return spec + "|" + version + "|" + sectionPath;
    }
}
