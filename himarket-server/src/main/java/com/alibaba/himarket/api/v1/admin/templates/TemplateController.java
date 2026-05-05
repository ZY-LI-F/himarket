package com.alibaba.himarket.api.v1.admin.templates;

import com.alibaba.himarket.core.annotation.AdminAuth;
import com.alibaba.himarket.core.annotation.PublicAccess;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.entity.IchTemplate;
import com.alibaba.himarket.repository.IchTemplateRepository;
import com.alibaba.himarket.service.IchTemplateSeeder;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final IchTemplateRepository repository;
    private final IchTemplateSeeder seeder;

    @GetMapping
    @PublicAccess
    public List<IchTemplate> listTemplates(
            @RequestParam(required = false) String spec,
            @RequestParam(defaultValue = IchTemplate.DEFAULT_VERSION) String version) {
        if (spec == null || spec.isBlank()) {
            return repository.findByVersionOrderBySpecAscSectionOrderAscSectionPathAsc(version);
        }
        return repository.findBySpecAndVersionOrderBySectionOrderAscSectionPathAsc(
                IchTemplate.normalizeSpec(spec), version);
    }

    @GetMapping("/{id}")
    @PublicAccess
    public IchTemplate getTemplate(@PathVariable Long id) {
        return repository
                .findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "ich_template", id));
    }

    @PostMapping("/import-ich-baseline")
    @AdminAuth
    public ImportIchBaselineResponse importIchBaseline() throws IOException {
        return new ImportIchBaselineResponse(seeder.seedTemplates());
    }

    public record ImportIchBaselineResponse(int seededResources) {}
}
