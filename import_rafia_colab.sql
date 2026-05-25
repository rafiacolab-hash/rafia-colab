-- Ráfia Co.Lab Import Script
-- Execute in Supabase SQL Editor (Table Editor > SQL)

-- ==================================================
-- ZNG
-- ==================================================
DO $$
DECLARE
  v_zng_id UUID;
  v_ml_zng_2026_03 UUID;
BEGIN
  SELECT id INTO v_zng_id FROM clients WHERE name ILIKE '%ZNG%' LIMIT 1;
  IF v_zng_id IS NULL THEN RAISE EXCEPTION 'Cliente ZNG não encontrado'; END IF;

  -- Garantir month_list 2026-03
  INSERT INTO month_lists (client_id, month_ref, year)
    SELECT v_zng_id, '2026-03', 2026
    WHERE NOT EXISTS (SELECT 1 FROM month_lists WHERE client_id=v_zng_id AND month_ref='2026-03');
  SELECT id INTO v_ml_zng_2026_03 FROM month_lists WHERE client_id=v_zng_id AND month_ref='2026-03';

  -- 2026-03-01 (Dom)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-01') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='Frase Motivacional (linkar com a semana da Mulher)', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-01';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-01', 'Dom',
      NULL, NULL,
      'Frase Motivacional (linkar com a semana da Mulher)', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-02 (Seg)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-02') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Compre On-line', stories_status='POSTADO',
      feed_content='Carrossel Campanha Conceito + Ação', feed_status='POSTADO',
      acoes_content='E-mail Mkt  e GRUPO VIP', acoes_status='POSTADO',
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-02';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-02', 'Seg',
      'Compre On-line', 'POSTADO',
      'Carrossel Campanha Conceito + Ação', 'POSTADO',
      'E-mail Mkt  e GRUPO VIP', 'POSTADO',
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-03 (Ter)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-03') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Vitrine ZNG (vídeo de 1 look)', stories_status='POSTADO',
      feed_content='Carrosel Produto (Shorts)', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-03';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-03', 'Ter',
      'Vitrine ZNG (vídeo de 1 look)', 'POSTADO',
      'Carrosel Produto (Shorts)', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-04 (Qua)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-04') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Dia na Fábrica', stories_status='POSTADO',
      feed_content='Reels: Vídeo desembalando um pedido e mostrando o balm que vai ir junto com as compras, narrado, explicando que durante essa semana, todos os pedidos irão com o balm especial ZNG', feed_status='POSTADO',
      acoes_content='Entregar presente para as mulheres da empresa, mostrar nos stories e gravar para o vídeo final', acoes_status='POSTADO',
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-04';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-04', 'Qua',
      'Dia na Fábrica', 'POSTADO',
      'Reels: Vídeo desembalando um pedido e mostrando o balm que vai ir junto com as compras, narrado, explicando que durante essa semana, todos os pedidos irão com o balm especial ZNG', 'POSTADO',
      'Entregar presente para as mulheres da empresa, mostrar nos stories e gravar para o vídeo final', 'POSTADO',
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-06 (Sex)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-06') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='Reels: desembalando brinde', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes='Prazo de envio dos vídeos das Influencers'
    WHERE client_id=v_zng_id AND entry_date='2026-03-06';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-06', 'Sex',
      NULL, NULL,
      'Reels: desembalando brinde', 'POSTADO',
      NULL, NULL,
      NULL, NULL, 'Prazo de envio dos vídeos das Influencers');
  END IF;
  -- 2026-03-07 (Sáb)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-07') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Look Inspiração (look completo)', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-07';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-07', 'Sáb',
      'Look Inspiração (look completo)', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-08 (Dom)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-08') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Dia da Mulher (recorte do vídeo do feed)', stories_status='POSTADO',
      feed_content='Reels: Dia da Mulher Motivacional, uma pegada mais emotiva', feed_status='POSTADO',
      acoes_content='(convidando a ver o manifesto no insta) LINK no GRUPO VIP', acoes_status='POSTADO',
      legenda_copy=NULL, arte_link=NULL, observacoes='usar todos os vídeos gerados pelas influencers e presente para as funcionárias'
    WHERE client_id=v_zng_id AND entry_date='2026-03-08';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-08', 'Dom',
      'Dia da Mulher (recorte do vídeo do feed)', 'POSTADO',
      'Reels: Dia da Mulher Motivacional, uma pegada mais emotiva', 'POSTADO',
      '(convidando a ver o manifesto no insta) LINK no GRUPO VIP', 'POSTADO',
      NULL, NULL, 'usar todos os vídeos gerados pelas influencers e presente para as funcionárias');
  END IF;
  -- 2026-03-09 (Seg)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-09') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Compre On-line', stories_status='POSTADO',
      feed_content='SPOILER // CATEGORIA OUTLET SENDO ATUALIZADA (O FUNDO DO SITE E ALGUMA COISA CARREGNDO NA FRENTE)', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-09';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-09', 'Seg',
      'Compre On-line', 'POSTADO',
      'SPOILER // CATEGORIA OUTLET SENDO ATUALIZADA (O FUNDO DO SITE E ALGUMA COISA CARREGNDO NA FRENTE)', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-10 (Ter)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-10') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Vitrine ZNG (vídeo de 1 look)', stories_status='POSTADO',
      feed_content='VÍDEO COM A ABA OUTLET PASSANDO E O BOTÃO DE CATEADO, CLIQUE PARA DESBLOQUEAR EM BREVE', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-10';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-10', 'Ter',
      'Vitrine ZNG (vídeo de 1 look)', 'POSTADO',
      'VÍDEO COM A ABA OUTLET PASSANDO E O BOTÃO DE CATEADO, CLIQUE PARA DESBLOQUEAR EM BREVE', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-11 (Qua)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-11') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Dia na Fábrica  (silumar separando produtos para o OUTLET)', stories_status='POSTADO',
      feed_content='Reels da Rotina da Lea (colocar em colab)', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes='Vídeo no grupo'
    WHERE client_id=v_zng_id AND entry_date='2026-03-11';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-11', 'Qua',
      'Dia na Fábrica  (silumar separando produtos para o OUTLET)', 'POSTADO',
      'Reels da Rotina da Lea (colocar em colab)', 'POSTADO',
      NULL, NULL,
      NULL, NULL, 'Vídeo no grupo');
  END IF;
  -- 2026-03-12 (Qui)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-12') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content=NULL, feed_status=NULL,
      acoes_content='Antecipação no GRUPO VIP', acoes_status='POSTADO',
      legenda_copy=NULL, arte_link=NULL, observacoes='Sabe o Tecido XXXX, conheça os beneficios'
    WHERE client_id=v_zng_id AND entry_date='2026-03-12';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-12', 'Qui',
      NULL, NULL,
      NULL, NULL,
      'Antecipação no GRUPO VIP', 'POSTADO',
      NULL, NULL, 'Sabe o Tecido XXXX, conheça os beneficios');
  END IF;
  -- 2026-03-13 (Sex)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-13') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='Carrosel Produto (DO OUTLET)', feed_status='POSTADO',
      acoes_content='E-MAIL MKT | BANNER SITE', acoes_status='POSTADO',
      legenda_copy=NULL, arte_link=NULL, observacoes='INICIO DA OFERTA OUTLET DO CONSUMIDOR ZNG'
    WHERE client_id=v_zng_id AND entry_date='2026-03-13';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-13', 'Sex',
      NULL, NULL,
      'Carrosel Produto (DO OUTLET)', 'POSTADO',
      'E-MAIL MKT | BANNER SITE', 'POSTADO',
      NULL, NULL, 'INICIO DA OFERTA OUTLET DO CONSUMIDOR ZNG');
  END IF;
  -- 2026-03-14 (Sáb)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-14') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Look Inspiração (look completo)', stories_status='POSTADO',
      feed_content='VÍDEO DA ABA MOSTRANDO AS OPÇÕES DA OFERTA  // CLIQUE AQUI E APROVEITE', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-14';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-14', 'Sáb',
      'Look Inspiração (look completo)', 'POSTADO',
      'VÍDEO DA ABA MOSTRANDO AS OPÇÕES DA OFERTA  // CLIQUE AQUI E APROVEITE', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-15 (Dom)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-15') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes='Dia do Consumidor (15 dias de Oferta)'
    WHERE client_id=v_zng_id AND entry_date='2026-03-15';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-15', 'Dom',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, 'Dia do Consumidor (15 dias de Oferta)');
  END IF;
  -- 2026-03-16 (Seg)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-16') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Compre On-line', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes='Lançamento Coleção Atacado (DROP 1)'
    WHERE client_id=v_zng_id AND entry_date='2026-03-16';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-16', 'Seg',
      'Compre On-line', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, 'Lançamento Coleção Atacado (DROP 1)');
  END IF;
  -- 2026-03-17 (Ter)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-17') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Vitrine ZNG (vídeo de 1 look)', stories_status='POSTADO',
      feed_content='ATENÇÃO! ANTES QUE ACABE! SELEÇÃO COM 50%OFF', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-17';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-17', 'Ter',
      'Vitrine ZNG (vídeo de 1 look)', 'POSTADO',
      'ATENÇÃO! ANTES QUE ACABE! SELEÇÃO COM 50%OFF', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-18 (Qua)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-18') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Dia na Fábrica   (Mostrar o processo de embalagem das vendas do site e falar que estamos a todo vapor embalando os pedidos do OUTLET)', stories_status='POSTADO',
      feed_content='Reels:(quadro: COMO NASCE UMA COLEÇÃO) Parte 1', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-18';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-18', 'Qua',
      'Dia na Fábrica   (Mostrar o processo de embalagem das vendas do site e falar que estamos a todo vapor embalando os pedidos do OUTLET)', 'POSTADO',
      'Reels:(quadro: COMO NASCE UMA COLEÇÃO) Parte 1', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-19 (Qui)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-19') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Foto + Vídeo', stories_status='POSTADO',
      feed_content='VÍDEO DA ABA MOSTRANDO AS OPÇÕES DA OFERTA  // CLIQUE AQUI E APROVEITE', feed_status='POSTADO',
      acoes_content='E-MAIL MKT | ÚLTIMOS DIAS  e GRUPO VIP', acoes_status='POSTADO',
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-19';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-19', 'Qui',
      'Foto + Vídeo', 'POSTADO',
      'VÍDEO DA ABA MOSTRANDO AS OPÇÕES DA OFERTA  // CLIQUE AQUI E APROVEITE', 'POSTADO',
      'E-MAIL MKT | ÚLTIMOS DIAS  e GRUPO VIP', 'POSTADO',
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-20 (Sex)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-20') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Bem Vindo Outono', stories_status='POSTADO',
      feed_content='Inicio do Outono Carrosel Produto (Produtos para seu Outono)', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-20';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-20', 'Sex',
      'Bem Vindo Outono', 'POSTADO',
      'Inicio do Outono Carrosel Produto (Produtos para seu Outono)', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-22 (Dom)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-22') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content=NULL, feed_status=NULL,
      acoes_content='REMOVER BANNER SITE', acoes_status='POSTADO',
      legenda_copy=NULL, arte_link=NULL, observacoes='FIM DA PROMOÇÂO'
    WHERE client_id=v_zng_id AND entry_date='2026-03-22';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-22', 'Dom',
      NULL, NULL,
      NULL, NULL,
      'REMOVER BANNER SITE', 'POSTADO',
      NULL, NULL, 'FIM DA PROMOÇÂO');
  END IF;
  -- 2026-03-23 (Seg)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-23') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Compre On-line', stories_status='POSTADO',
      feed_content='Reels da Rotina da Fer Martins (colocar em colab)', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes='Vídeo no Grupo AGENDADO PELO CELULAR'
    WHERE client_id=v_zng_id AND entry_date='2026-03-23';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-23', 'Seg',
      'Compre On-line', 'POSTADO',
      'Reels da Rotina da Fer Martins (colocar em colab)', 'POSTADO',
      NULL, NULL,
      NULL, NULL, 'Vídeo no Grupo AGENDADO PELO CELULAR');
  END IF;
  -- 2026-03-24 (Ter)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-24') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Vitrine ZNG (vídeo de 1 look)', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-24';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-24', 'Ter',
      'Vitrine ZNG (vídeo de 1 look)', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-25 (Qua)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-25') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Dia na Fábrica  (MOSTRAR A ORGANIZAÇÃO QUE EM BREVE VEM LANÇAMENTO NO SITE DA NOVA COLEÇÃO)', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes='Produção coleção nova'
    WHERE client_id=v_zng_id AND entry_date='2026-03-25';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-25', 'Qua',
      'Dia na Fábrica  (MOSTRAR A ORGANIZAÇÃO QUE EM BREVE VEM LANÇAMENTO NO SITE DA NOVA COLEÇÃO)', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, 'Produção coleção nova');
  END IF;
  -- 2026-03-26 (Qui)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-26') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Curiosidades ZNG (vamos conhecer um pouco sobre nossas peças)', stories_status='POSTADO',
      feed_content='Reels:(quadro: COMO NASCE UMA COLEÇÃO) Parte 2', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes='Falar sobre o toque do tecido no corpo, a importancia do Elastano e seus beneficios'
    WHERE client_id=v_zng_id AND entry_date='2026-03-26';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-26', 'Qui',
      'Curiosidades ZNG (vamos conhecer um pouco sobre nossas peças)', 'POSTADO',
      'Reels:(quadro: COMO NASCE UMA COLEÇÃO) Parte 2', 'POSTADO',
      NULL, NULL,
      NULL, NULL, 'Falar sobre o toque do tecido no corpo, a importancia do Elastano e seus beneficios');
  END IF;
  -- 2026-03-27 (Sex)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-27') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='15% de Desconto na Primeira Compra', stories_status='POSTADO',
      feed_content='Carrossel Produto (macacões)', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-27';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-27', 'Sex',
      '15% de Desconto na Primeira Compra', 'POSTADO',
      'Carrossel Produto (macacões)', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-28 (Sáb)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-28') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Look Inspiração (look completo)', stories_status='POSTADO',
      feed_content='Reels da Rotina da Barbara(colocar em colab)', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-28';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-28', 'Sáb',
      'Look Inspiração (look completo)', 'POSTADO',
      'Reels da Rotina da Barbara(colocar em colab)', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-29 (Dom)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-29') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='Frase Motivacional', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-29';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-29', 'Dom',
      NULL, NULL,
      'Frase Motivacional', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-30 (Seg)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-30') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Compre On-line', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-30';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-30', 'Seg',
      'Compre On-line', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-31 (Ter)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_zng_id AND entry_date='2026-03-31') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_zng_2026_03,
      stories_content='Vitrine ZNG (vídeo de 1 look)', stories_status='POSTADO',
      feed_content='Reels da Rotina da XXXXXX (colocar em colab)', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_zng_id AND entry_date='2026-03-31';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_zng_id, v_ml_zng_2026_03, '2026-03-31', 'Ter',
      'Vitrine ZNG (vídeo de 1 look)', 'POSTADO',
      'Reels da Rotina da XXXXXX (colocar em colab)', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
END $$;

-- ==================================================
-- Perfect Glam
-- ==================================================
DO $$
DECLARE
  v_perfect_glam_id UUID;
BEGIN
  SELECT id INTO v_perfect_glam_id FROM clients WHERE name ILIKE '%Perfect Glam%' LIMIT 1;
  IF v_perfect_glam_id IS NULL THEN RAISE EXCEPTION 'Cliente Perfect Glam não encontrado'; END IF;

END $$;

-- ==================================================
-- Rafia
-- ==================================================
DO $$
DECLARE
  v_rafia_id UUID;
  v_ml_rafia_2026_03 UUID;
BEGIN
  SELECT id INTO v_rafia_id FROM clients WHERE name ILIKE '%Ráfia%' LIMIT 1;
  IF v_rafia_id IS NULL THEN RAISE EXCEPTION 'Cliente Rafia não encontrado'; END IF;

  -- Garantir month_list 2026-03
  INSERT INTO month_lists (client_id, month_ref, year)
    SELECT v_rafia_id, '2026-03', 2026
    WHERE NOT EXISTS (SELECT 1 FROM month_lists WHERE client_id=v_rafia_id AND month_ref='2026-03');
  SELECT id INTO v_ml_rafia_2026_03 FROM month_lists WHERE client_id=v_rafia_id AND month_ref='2026-03';

  -- 2026-03-03 (Ter)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_rafia_id AND entry_date='2026-03-03') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_rafia_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='O Sucesso da sua marca de moda exige estratégia', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_rafia_id AND entry_date='2026-03-03';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_rafia_id, v_ml_rafia_2026_03, '2026-03-03', 'Ter',
      NULL, NULL,
      'O Sucesso da sua marca de moda exige estratégia', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-18 (Qua)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_rafia_id AND entry_date='2026-03-18') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_rafia_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='Bate papo com viés', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_rafia_id AND entry_date='2026-03-18';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_rafia_id, v_ml_rafia_2026_03, '2026-03-18', 'Qua',
      NULL, NULL,
      'Bate papo com viés', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-21 (Sáb)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_rafia_id AND entry_date='2026-03-21') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_rafia_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='Reels Teste: Ano das distrações', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_rafia_id AND entry_date='2026-03-21';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_rafia_id, v_ml_rafia_2026_03, '2026-03-21', 'Sáb',
      NULL, NULL,
      'Reels Teste: Ano das distrações', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-23 (Seg)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_rafia_id AND entry_date='2026-03-23') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_rafia_2026_03,
      stories_content='Caixinha de Perguntas: Bora bater um papo sobre Marketing e Moda?', stories_status='POSTADO',
      feed_content='Reels: Ano das distrações', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_rafia_id AND entry_date='2026-03-23';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_rafia_id, v_ml_rafia_2026_03, '2026-03-23', 'Seg',
      'Caixinha de Perguntas: Bora bater um papo sobre Marketing e Moda?', 'POSTADO',
      'Reels: Ano das distrações', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-24 (Ter)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_rafia_id AND entry_date='2026-03-24') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_rafia_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='Carrossel: O que fazemos em nosso laboratório', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_rafia_id AND entry_date='2026-03-24';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_rafia_id, v_ml_rafia_2026_03, '2026-03-24', 'Ter',
      NULL, NULL,
      'Carrossel: O que fazemos em nosso laboratório', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-25 (Qua)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_rafia_id AND entry_date='2026-03-25') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_rafia_2026_03,
      stories_content='Stories Gravado', stories_status='POSTADO',
      feed_content='Bate papo com viés', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes='PODE ESCOLHER'
    WHERE client_id=v_rafia_id AND entry_date='2026-03-25';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_rafia_id, v_ml_rafia_2026_03, '2026-03-25', 'Qua',
      'Stories Gravado', 'POSTADO',
      'Bate papo com viés', 'POSTADO',
      NULL, NULL,
      NULL, NULL, 'PODE ESCOLHER');
  END IF;
  -- 2026-03-26 (Qui)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_rafia_id AND entry_date='2026-03-26') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_rafia_2026_03,
      stories_content='FeedBacks: Como anda nossas fórmulas por ai:', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_rafia_id AND entry_date='2026-03-26';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_rafia_id, v_ml_rafia_2026_03, '2026-03-26', 'Qui',
      'FeedBacks: Como anda nossas fórmulas por ai:', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-27 (Sex)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_rafia_id AND entry_date='2026-03-27') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_rafia_2026_03,
      stories_content='Storie Manifesto! (O que acreditamos.)', stories_status='POSTADO',
      feed_content='Reels: Ainda dá tempo de Planejar?', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes='Manifesto: Marca não nasce no feed. > Produto sem conceito não escala. > Moda sem estratégia vira liquidação. > Luxo não grita. Direciona. > Construir leva tempo.'
    WHERE client_id=v_rafia_id AND entry_date='2026-03-27';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_rafia_id, v_ml_rafia_2026_03, '2026-03-27', 'Sex',
      'Storie Manifesto! (O que acreditamos.)', 'POSTADO',
      'Reels: Ainda dá tempo de Planejar?', 'POSTADO',
      NULL, NULL,
      NULL, NULL, 'Manifesto: Marca não nasce no feed. > Produto sem conceito não escala. > Moda sem estratégia vira liquidação. > Luxo não grita. Direciona. > Construir leva tempo.');
  END IF;
  -- 2026-03-30 (Seg)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_rafia_id AND entry_date='2026-03-30') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_rafia_2026_03,
      stories_content='Caixinha de Perguntas: Bora bater um papo sobre Marketing e Moda?', stories_status='POSTADO',
      feed_content='Quem já passou pelo nosso Laboratório: (Feedbacks)', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_rafia_id AND entry_date='2026-03-30';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_rafia_id, v_ml_rafia_2026_03, '2026-03-30', 'Seg',
      'Caixinha de Perguntas: Bora bater um papo sobre Marketing e Moda?', 'POSTADO',
      'Quem já passou pelo nosso Laboratório: (Feedbacks)', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-31 (Ter)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_rafia_id AND entry_date='2026-03-31') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_rafia_2026_03,
      stories_content='Stories Gravado', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_rafia_id AND entry_date='2026-03-31';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_rafia_id, v_ml_rafia_2026_03, '2026-03-31', 'Ter',
      'Stories Gravado', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
END $$;

-- ==================================================
-- Maithe
-- ==================================================
DO $$
DECLARE
  v_maithe_id UUID;
  v_ml_maithe_2026_03 UUID;
BEGIN
  SELECT id INTO v_maithe_id FROM clients WHERE name ILIKE '%Maithë%' LIMIT 1;
  IF v_maithe_id IS NULL THEN RAISE EXCEPTION 'Cliente Maithe não encontrado'; END IF;

  -- Garantir month_list 2026-03
  INSERT INTO month_lists (client_id, month_ref, year)
    SELECT v_maithe_id, '2026-03', 2026
    WHERE NOT EXISTS (SELECT 1 FROM month_lists WHERE client_id=v_maithe_id AND month_ref='2026-03');
  SELECT id INTO v_ml_maithe_2026_03 FROM month_lists WHERE client_id=v_maithe_id AND month_ref='2026-03';

  -- 2026-03-01 (Dom)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-01') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content='Bem Vindo Março', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-01';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-01', 'Dom',
      'Bem Vindo Março', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-05 (Qui)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-05') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content='Apresentação do Conceito da Coleção, colocar o texto em uma parte do fashion film', stories_status='POSTADO',
      feed_content='Carrossel: Capa com a logo da coleção e a seguinte com o texto do conceito', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-05';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-05', 'Qui',
      'Apresentação do Conceito da Coleção, colocar o texto em uma parte do fashion film', 'POSTADO',
      'Carrossel: Capa com a logo da coleção e a seguinte com o texto do conceito', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-08 (Dom)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-08') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content='Dia da Mulher (usar banco de imagem)', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-08';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-08', 'Dom',
      'Dia da Mulher (usar banco de imagem)', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-09 (Seg)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-09') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='Produto: carrossel 4262 / 4267', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-09';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-09', 'Seg',
      NULL, NULL,
      'Produto: carrossel 4262 / 4267', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-13 (Sex)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-13') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='Foto Tenis Cinza', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-13';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-13', 'Sex',
      NULL, NULL,
      'Foto Tenis Cinza', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-15 (Dom)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-15') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content='Dia do Consumidor', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-15';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-15', 'Dom',
      'Dia do Consumidor', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-17 (Ter)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-17') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='Reels: 10', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-17';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-17', 'Ter',
      NULL, NULL,
      'Reels: 10', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-18 (Qua)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-18') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content='Conceito da Coleção', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes='Pegar o post do dia 05 e fazer em formato de stories e criar um destaque'
    WHERE client_id=v_maithe_id AND entry_date='2026-03-18';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-18', 'Qua',
      'Conceito da Coleção', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, 'Pegar o post do dia 05 e fazer em formato de stories e criar um destaque');
  END IF;
  -- 2026-03-19 (Qui)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-19') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content='Mesma Foto 6 e 7', stories_status='POSTADO',
      feed_content='Carrossel: 6 e 7', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link='https://www.canva.com/design/DAHC_pPljgs/r5NtBjMN-nE7dgF_xNmtUA/edit?utm_content=DAHC_pPljgs&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton', observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-19';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-19', 'Qui',
      'Mesma Foto 6 e 7', 'POSTADO',
      'Carrossel: 6 e 7', 'POSTADO',
      NULL, NULL,
      NULL, 'https://www.canva.com/design/DAHC_pPljgs/r5NtBjMN-nE7dgF_xNmtUA/edit?utm_content=DAHC_pPljgs&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton', NULL);
  END IF;
  -- 2026-03-20 (Sex)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-20') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content='Bem Vindo Outono', stories_status='POSTADO',
      feed_content=NULL, feed_status=NULL,
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-20';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-20', 'Sex',
      'Bem Vindo Outono', 'POSTADO',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-24 (Ter)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-24') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content='foto: 8', stories_status='POSTADO',
      feed_content='Foto: 8', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-24';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-24', 'Ter',
      'foto: 8', 'POSTADO',
      'Foto: 8', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-27 (Sex)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-27') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content='foto 9 e 10', stories_status='POSTADO',
      feed_content='Carrossel: 9 e 10', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-27';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-27', 'Sex',
      'foto 9 e 10', 'POSTADO',
      'Carrossel: 9 e 10', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
  -- 2026-03-31 (Ter)
  IF EXISTS (SELECT 1 FROM day_entries WHERE client_id=v_maithe_id AND entry_date='2026-03-31') THEN
    UPDATE day_entries SET
      month_list_id=v_ml_maithe_2026_03,
      stories_content=NULL, stories_status=NULL,
      feed_content='Reels: 9', feed_status='POSTADO',
      acoes_content=NULL, acoes_status=NULL,
      legenda_copy=NULL, arte_link=NULL, observacoes=NULL
    WHERE client_id=v_maithe_id AND entry_date='2026-03-31';
  ELSE
    INSERT INTO day_entries (client_id, month_list_id, entry_date, dia_semana,
      stories_content, stories_status, feed_content, feed_status,
      acoes_content, acoes_status, legenda_copy, arte_link, observacoes)
    VALUES (v_maithe_id, v_ml_maithe_2026_03, '2026-03-31', 'Ter',
      NULL, NULL,
      'Reels: 9', 'POSTADO',
      NULL, NULL,
      NULL, NULL, NULL);
  END IF;
END $$;
