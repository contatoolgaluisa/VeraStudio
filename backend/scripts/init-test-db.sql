-- Executado só na primeira criação do volume do Docker.
-- Cria um banco separado para os testes automatizados, para que
-- os testes nunca apaguem os dados de desenvolvimento.
CREATE DATABASE vera_studio_test;
