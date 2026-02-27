# CLAUDE.md

## Jazyk
- Komunikuj se mnou česky
- Kód, commity a komentáře v kódu piš anglicky

## Pracovní styl
- Prováděj změny autonomně bez ptaní na potvrzení
- Pokud si jsi jistý řešením, rovnou ho implementuj
- Pokud je více možných přístupů, krátce vysvětli tradeoff a vyber lepší variantu
- Nepiš dlouhé vysvětlení před každou změnou — prostě ji udělej

## Před každou změnou
- Přečti si relevantní soubory, než je začneš editovat
- Zachovej existující styl kódu (formatting, naming conventions)
- Nemaž existující funkčnost, pokud to explicitně neřeknu

## Git
- Neprováděj git push bez mého potvrzení
- Commit messages piš anglicky, stručně, v imperativu (např. "Add keyword clustering script")

## Tech stack
- Python 3.11+
- Preferuj type hints
- Pro data processing používej pandas
- Pro API requesty používej requests nebo httpx
- Pro web UI používej Streamlit

## Testování
- Po každé větší změně spusť kód a ověř, že funguje
- Pokud test selže, oprav to sám bez ptaní