alter table lmsy_archive.projects
  add column if not exists title_i18n jsonb,
  add column if not exists description_i18n jsonb,
  add column if not exists theme_statement_i18n jsonb,
  add column if not exists homepage_excerpt_i18n jsonb;

comment on column lmsy_archive.projects.title_i18n is 'Localized project title: {"en":"","zh":"","th":""}';
comment on column lmsy_archive.projects.description_i18n is 'Localized project description: {"en":"","zh":"","th":""}';
comment on column lmsy_archive.projects.theme_statement_i18n is 'Localized curatorial theme statement: {"en":"","zh":"","th":""}';
comment on column lmsy_archive.projects.homepage_excerpt_i18n is 'Localized homepage excerpt: {"en":"","zh":"","th":""}';
