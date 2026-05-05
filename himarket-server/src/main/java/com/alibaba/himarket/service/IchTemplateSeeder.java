package com.alibaba.himarket.service;

import com.alibaba.himarket.entity.IchTemplate;
import com.alibaba.himarket.repository.IchTemplateRepository;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.Yaml;

@Component
@Slf4j
public class IchTemplateSeeder implements ApplicationRunner {

    private static final String BASELINE_PATTERN = "classpath*:ich-baseline/**/*.yaml";
    private static final Pattern LEADING_NUMBER = Pattern.compile("^(\\d+)");
    private static final Pattern TRAILING_NUMBER = Pattern.compile("(\\d+)$");

    private final IchTemplateRepository repository;
    private final ResourcePatternResolver resourcePatternResolver;
    private final Yaml yaml;

    public IchTemplateSeeder(IchTemplateRepository repository, ResourceLoader resourceLoader) {
        if (!(resourceLoader instanceof ResourcePatternResolver resolver)) {
            throw new IllegalArgumentException(
                    "ICH template seeder requires a ResourcePatternResolver ResourceLoader");
        }
        this.repository = repository;
        this.resourcePatternResolver = resolver;
        this.yaml = new Yaml();
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        int seeded = seedTemplates();
        log.info("Seeded {} ICH template resources", seeded);
    }

    @Transactional
    public int seedTemplates() throws IOException {
        Resource[] resources = resourcePatternResolver.getResources(BASELINE_PATTERN);
        if (resources.length == 0) {
            throw new IllegalStateException(
                    "No ICH baseline YAML resources matched " + BASELINE_PATTERN);
        }

        Resource[] sortedResources =
                Arrays.stream(resources)
                        .sorted(Comparator.comparing(Resource::getDescription))
                        .toArray(Resource[]::new);
        for (Resource resource : sortedResources) {
            seedResource(resource);
        }
        return sortedResources.length;
    }

    private void seedResource(Resource resource) throws IOException {
        Map<?, ?> document = loadYaml(resource);
        String spec = IchTemplate.normalizeSpec(requiredString(document, "spec", resource));
        String sectionPath = requiredString(document, "section_path", resource);
        String outline = requiredNestedString(document, "body", "outline", resource);
        String title = optionalString(document, "title");
        int sectionOrder = sectionOrder(sectionPath);
        String sourcePath = resource.getDescription();

        IchTemplate template =
                repository
                        .findBySpecAndVersionAndSectionPath(
                                spec, IchTemplate.DEFAULT_VERSION, sectionPath)
                        .orElseGet(IchTemplate::new);
        template.setSpec(spec);
        template.setVersion(IchTemplate.DEFAULT_VERSION);
        template.setSectionPath(sectionPath);
        template.setSectionOrder(sectionOrder);
        template.setTitle(title);
        template.setOutline(outline);
        template.setSourcePath(sourcePath);
        repository.save(template);
    }

    private Map<?, ?> loadYaml(Resource resource) throws IOException {
        try (InputStream inputStream = resource.getInputStream()) {
            Object loaded = yaml.load(inputStream);
            if (loaded instanceof Map<?, ?> map) {
                return map;
            }
            throw new IllegalStateException(
                    "YAML root must be a map: " + resource.getDescription());
        }
    }

    private String requiredString(Map<?, ?> document, String key, Resource resource) {
        Object value = document.get(key);
        if (value instanceof String stringValue && !stringValue.isBlank()) {
            return stringValue.trim();
        }
        throw new IllegalStateException(
                "Missing required YAML field `" + key + "` in " + resource.getDescription());
    }

    private String requiredNestedString(
            Map<?, ?> document, String parentKey, String childKey, Resource resource) {
        Object parent = document.get(parentKey);
        if (parent instanceof Map<?, ?> parentMap) {
            Object value = parentMap.get(childKey);
            if (value instanceof String stringValue && !stringValue.isBlank()) {
                return stringValue.trim();
            }
        }
        throw new IllegalStateException(
                "Missing required YAML field `"
                        + parentKey
                        + "."
                        + childKey
                        + "` in "
                        + resource.getDescription());
    }

    private String optionalString(Map<?, ?> document, String key) {
        Object value = document.get(key);
        if (value instanceof String stringValue && !stringValue.isBlank()) {
            return stringValue.trim();
        }
        return null;
    }

    private int sectionOrder(String sectionPath) {
        String normalized = sectionPath.trim().toUpperCase(Locale.ROOT);
        Matcher leadingNumber = LEADING_NUMBER.matcher(normalized);
        if (leadingNumber.find()) {
            return Integer.parseInt(leadingNumber.group(1));
        }

        if (normalized.startsWith("ANNEX") || normalized.startsWith("APPENDICES")) {
            return 8000;
        }
        if (normalized.startsWith("GLOSSARY")) {
            return 8500;
        }
        if (normalized.startsWith("ATTACHMENT")) {
            Matcher trailingNumber = TRAILING_NUMBER.matcher(normalized);
            return trailingNumber.find() ? 9000 + Integer.parseInt(trailingNumber.group(1)) : 9000;
        }

        int order = 0;
        for (String token : normalized.split("\\.")) {
            order = order * 100 + sectionTokenOrder(token);
        }
        return order;
    }

    private int sectionTokenOrder(String token) {
        if (token.chars().allMatch(Character::isDigit)) {
            return Integer.parseInt(token);
        }
        if (token.length() == 1 && token.charAt(0) >= 'A' && token.charAt(0) <= 'Z') {
            return token.charAt(0) - 'A' + 1;
        }
        return romanToInt(token);
    }

    private int romanToInt(String roman) {
        Map<Character, Integer> values = new LinkedHashMap<>();
        values.put('I', 1);
        values.put('V', 5);
        values.put('X', 10);
        int result = 0;
        int previous = 0;
        for (int i = roman.length() - 1; i >= 0; i--) {
            int current = values.getOrDefault(roman.charAt(i), 0);
            if (current < previous) {
                result -= current;
            } else {
                result += current;
                previous = current;
            }
        }
        if (result == 0) {
            throw new IllegalStateException("Unsupported ICH section path token: " + roman);
        }
        return result;
    }
}
