package com.alibaba.himarket.api.v1.admin.templates;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.core.annotation.AdminAuth;
import com.alibaba.himarket.entity.IchTemplate;
import com.alibaba.himarket.repository.IchTemplateRepository;
import com.alibaba.himarket.service.IchTemplateSeeder;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class TemplateControllerTest {

    @Test
    void listsE3TemplatesByCanonicalizedSpec() throws Exception {
        IchTemplateRepository repository = mock(IchTemplateRepository.class);
        IchTemplateSeeder seeder = mock(IchTemplateSeeder.class);
        List<IchTemplate> e3Templates =
                IntStream.rangeClosed(1, 16)
                        .mapToObj(
                                section ->
                                        template(
                                                (long) section,
                                                "ICH-E3",
                                                String.valueOf(section),
                                                section))
                        .toList();
        when(repository.findBySpecAndVersionOrderBySectionOrderAscSectionPathAsc(
                        "ICH-E3", IchTemplate.DEFAULT_VERSION))
                .thenReturn(e3Templates);

        MockMvc mockMvc =
                MockMvcBuilders.standaloneSetup(new TemplateController(repository, seeder)).build();

        mockMvc.perform(get("/api/v1/templates").param("spec", "ICH-E3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(16)))
                .andExpect(jsonPath("$[0].spec").value("ICH-E3"))
                .andExpect(jsonPath("$[15].sectionPath").value("16"));
    }

    @Test
    void getsTemplateDetailById() throws Exception {
        IchTemplateRepository repository = mock(IchTemplateRepository.class);
        IchTemplateSeeder seeder = mock(IchTemplateSeeder.class);
        IchTemplate template = template(7L, "ICH-E3", "7", 7);
        when(repository.findById(7L)).thenReturn(Optional.of(template));

        MockMvc mockMvc =
                MockMvcBuilders.standaloneSetup(new TemplateController(repository, seeder)).build();

        mockMvc.perform(get("/api/v1/templates/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.spec").value("ICH-E3"))
                .andExpect(jsonPath("$.sectionPath").value("7"));
    }

    @Test
    void importsIchBaselineWithAdminOnlyEndpoint() throws Exception {
        IchTemplateRepository repository = mock(IchTemplateRepository.class);
        IchTemplateSeeder seeder = mock(IchTemplateSeeder.class);
        when(seeder.seedTemplates()).thenReturn(58);
        MockMvc mockMvc =
                MockMvcBuilders.standaloneSetup(new TemplateController(repository, seeder)).build();

        mockMvc.perform(post("/api/v1/templates/import-ich-baseline"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seededResources").value(58));

        verify(seeder).seedTemplates();
        Method importMethod = TemplateController.class.getDeclaredMethod("importIchBaseline");
        assertNotNull(importMethod.getAnnotation(AdminAuth.class));
    }

    private IchTemplate template(Long id, String spec, String sectionPath, Integer sectionOrder) {
        IchTemplate template =
                IchTemplate.builder()
                        .spec(spec)
                        .version(IchTemplate.DEFAULT_VERSION)
                        .sectionPath(sectionPath)
                        .sectionOrder(sectionOrder)
                        .title("Section " + sectionPath)
                        .outline("Outline " + sectionPath)
                        .sourcePath("test://" + sectionPath)
                        .build();
        template.setId(id);
        return template;
    }
}
