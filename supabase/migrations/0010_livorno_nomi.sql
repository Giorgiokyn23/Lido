-- Lido - 0010: nomi commerciali aggiuntivi provincia di Livorno (OSM, raggio 150m)
-- Aggiorna 38 concessioni finora provvisorie. Guardia anti-collisione: non fallisce.
-- Il numero di concessione resta in id_concessione. Idempotente. Esegui quando vuoi.

update public.beaches b set nome='Bagno La Playa Felice', fonte='SID-MIT+OSM'
  where b.id_concessione='2010A001145'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno La Playa Felice' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Onda Blu', fonte='SID-MIT+OSM'
  where b.id_concessione='2011B004160'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Onda Blu' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Onda Blu ·2', fonte='SID-MIT+OSM'
  where b.id_concessione='2009I004205'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Onda Blu ·2' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Il Paradisino', fonte='SID-MIT+OSM'
  where b.id_concessione='2010C001318'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Il Paradisino' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagno Cavalleggeri', fonte='SID-MIT+OSM'
  where b.id_concessione='2009K002290'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno Cavalleggeri' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Le Dune', fonte='SID-MIT+OSM'
  where b.id_concessione='2007F002044'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Le Dune' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Tombolo Resort Beach', fonte='SID-MIT+OSM'
  where b.id_concessione='2010J003971'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Tombolo Resort Beach' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Marina di Bagnaia', fonte='SID-MIT+OSM'
  where b.id_concessione='2008K004550'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Marina di Bagnaia' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagni Vittorio Emanuele', fonte='SID-MIT+OSM'
  where b.id_concessione='2009Q002665'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagni Vittorio Emanuele' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Garden Toscana Resort', fonte='SID-MIT+OSM'
  where b.id_concessione='2009L002291'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Garden Toscana Resort' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Spiaggia Stella Maris', fonte='SID-MIT+OSM'
  where b.id_concessione='2010H001278'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Spiaggia Stella Maris' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagni Pancaldi/Acquaviva', fonte='SID-MIT+OSM'
  where b.id_concessione='2009Q000865'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagni Pancaldi/Acquaviva' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Mistral', fonte='SID-MIT+OSM'
  where b.id_concessione='2009K003271'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Mistral' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagnoskiuma', fonte='SID-MIT+OSM'
  where b.id_concessione='2010B001263'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagnoskiuma' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagno El Faro', fonte='SID-MIT+OSM'
  where b.id_concessione='2015C002204'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno El Faro' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagno Golf', fonte='SID-MIT+OSM'
  where b.id_concessione='2009S002658'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno Golf' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagni Paolieri', fonte='SID-MIT+OSM'
  where b.id_concessione='2012O001859'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagni Paolieri' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Pappafico Beach & Club', fonte='SID-MIT+OSM'
  where b.id_concessione='2009H000910'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Pappafico Beach & Club' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagno Tirrenia', fonte='SID-MIT+OSM'
  where b.id_concessione='2009S001965'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno Tirrenia' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagno Nettuno', fonte='SID-MIT+OSM'
  where b.id_concessione='2009O001952'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno Nettuno' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagno Saint Michael', fonte='SID-MIT+OSM'
  where b.id_concessione='2008N001394'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno Saint Michael' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Il tesorino', fonte='SID-MIT+OSM'
  where b.id_concessione='2008L001464'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Il tesorino' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagno Alma', fonte='SID-MIT+OSM'
  where b.id_concessione='2009P001962'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno Alma' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Single fin', fonte='SID-MIT+OSM'
  where b.id_concessione='2010C000931'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Single fin' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagni salvadori', fonte='SID-MIT+OSM'
  where b.id_concessione='2009V001977'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagni salvadori' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Guardia Costiera', fonte='SID-MIT+OSM'
  where b.id_concessione='2015F003044'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Guardia Costiera' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Pappafico Beach & Club ·2', fonte='SID-MIT+OSM'
  where b.id_concessione='2009H002323'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Pappafico Beach & Club ·2' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Circolo Pesca Sportiva', fonte='SID-MIT+OSM'
  where b.id_concessione='2009D002013'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Circolo Pesca Sportiva' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Onda Blu ·3', fonte='SID-MIT+OSM'
  where b.id_concessione='2009K004207'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Onda Blu ·3' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Porticciolo del Chioma', fonte='SID-MIT+OSM'
  where b.id_concessione='2010I001819'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Porticciolo del Chioma' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagni Sirena', fonte='SID-MIT+OSM'
  where b.id_concessione='2009I004214'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagni Sirena' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Etruria', fonte='SID-MIT+OSM'
  where b.id_concessione='2009O000872'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Etruria' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Lido 76', fonte='SID-MIT+OSM'
  where b.id_concessione='2009T002659'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Lido 76' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Single fin ·2', fonte='SID-MIT+OSM'
  where b.id_concessione='2009N000871'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Single fin ·2' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagno Lido', fonte='SID-MIT+OSM'
  where b.id_concessione='2009S001956'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno Lido' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagno Imperiale', fonte='SID-MIT+OSM'
  where b.id_concessione='2013J001547'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno Imperiale' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagno Arlecchino', fonte='SID-MIT+OSM'
  where b.id_concessione='2009J001722'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno Arlecchino' and x.id_concessione is distinct from b.id_concessione);
update public.beaches b set nome='Bagno Mary', fonte='SID-MIT+OSM'
  where b.id_concessione='2009X001997'
    and not exists (select 1 from public.beaches x where x.localita=b.localita and x.nome='Bagno Mary' and x.id_concessione is distinct from b.id_concessione);
