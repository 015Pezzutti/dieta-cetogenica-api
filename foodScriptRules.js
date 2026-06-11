// foodScriptRules.js
// SCRIPT DETALHADO COMPLETO - Análise de Alimentos por Foto

export const FOOD_SCRIPT_RULES = {
  version: "2.0",
  description: "Script completo para identificação de alimentos em fotos de refeições",
  lastUpdate: "2026-05-22",
  
  // ============================================
  // LISTA COMPLETA DE ALIMENTOS
  // ============================================
  knownFoods: [
    // ========== CEREAIS E GRÃOS ==========
    {
      name: "Arroz Branco",
      patterns: ["arroz", "rice", "branco", "white rice", "arroz soltinho"],
      typicalValues: { carbs: 28, protein: 2.5, fat: 0.3, calories: 130, portionGrams: 150 }
    },
    {
      name: "Arroz Integral",
      patterns: ["arroz integral", "brown rice", "arroz integrais"],
      typicalValues: { carbs: 23, protein: 2.6, fat: 0.9, calories: 111, portionGrams: 150 }
    },
    {
      name: "Macarrão",
      patterns: ["macarrão", "massa", "pasta", "spaghetti", "noodles", "talharim", "parafuso", "penne"],
      typicalValues: { carbs: 75, protein: 13, fat: 1.5, calories: 370, portionGrams: 100 }
    },
    {
      name: "Pão Francês",
      patterns: ["pão francês", "pão", "bread", "cacetinho", "pão de sal"],
      typicalValues: { carbs: 58, protein: 8, fat: 3, calories: 300, portionGrams: 50 }
    },
    {
      name: "Pão Integral",
      patterns: ["pão integral", "whole wheat bread", "pão de forma integral"],
      typicalValues: { carbs: 43, protein: 13, fat: 4, calories: 265, portionGrams: 50 }
    },
    {
      name: "Aveia",
      patterns: ["aveia", "oats", "oatmeal", "mingau de aveia"],
      typicalValues: { carbs: 66, protein: 16.9, fat: 6.9, calories: 389, portionGrams: 40 }
    },
    {
      name: "Quinoa",
      patterns: ["quinoa", "quinua"],
      typicalValues: { carbs: 21, protein: 4.4, fat: 1.9, calories: 120, portionGrams: 150 }
    },
    {
      name: "Cuscuz",
      patterns: ["cuscuz", "couscous"],
      typicalValues: { carbs: 23, protein: 3.8, fat: 0.2, calories: 112, portionGrams: 100 }
    },
    
    // ========== LEGUMINOSAS ==========
    {
      name: "Feijão Preto",
      patterns: ["feijão preto", "feijao preto", "black beans"],
      typicalValues: { carbs: 20, protein: 8, fat: 0.5, calories: 110, portionGrams: 100 }
    },
    {
      name: "Feijão Carioca",
      patterns: ["feijão carioca", "feijao carioca", "feijão mulatinho", "brown beans"],
      typicalValues: { carbs: 19, protein: 7.5, fat: 0.8, calories: 105, portionGrams: 100 }
    },
    {
      name: "Lentilha",
      patterns: ["lentilha", "lentilhas", "lentils"],
      typicalValues: { carbs: 20, protein: 9, fat: 0.4, calories: 116, portionGrams: 100 }
    },
    {
      name: "Grão de Bico",
      patterns: ["grão de bico", "grao de bico", "chickpeas"],
      typicalValues: { carbs: 27, protein: 8.9, fat: 2.6, calories: 139, portionGrams: 100 }
    },
    {
      name: "Ervilha",
      patterns: ["ervilha", "peas", "ervilhas"],
      typicalValues: { carbs: 14, protein: 5, fat: 0.4, calories: 81, portionGrams: 80 }
    },
    {
      name: "Soja",
      patterns: ["soja", "soy", "edamame"],
      typicalValues: { carbs: 9, protein: 11, fat: 5, calories: 122, portionGrams: 100 }
    },
    
    // ========== CARNES ==========
    {
      name: "Frango Grelhado",
      patterns: ["frango grelhado", "chicken breast", "peito de frango", "filé de frango"],
      typicalValues: { carbs: 0, protein: 31, fat: 3.6, calories: 165, portionGrams: 150 }
    },
    {
      name: "Frango Assado",
      patterns: ["frango assado", "roast chicken", "frango inteiro"],
      typicalValues: { carbs: 0, protein: 27, fat: 8, calories: 190, portionGrams: 150 }
    },
    {
      name: "Frango Frito",
      patterns: ["frango frito", "fried chicken", "frango empanado", "frango crocante"],
      typicalValues: { carbs: 10, protein: 25, fat: 15, calories: 300, portionGrams: 150 }
    },
    {
      name: "Carne Bovina - Patinho",
      patterns: ["patinho", "carne magra", "lean beef"],
      typicalValues: { carbs: 0, protein: 26, fat: 8, calories: 180, portionGrams: 150 }
    },
    {
      name: "Carne Bovina - Contra-filé",
      patterns: ["contra-filé", "contra file", "sirloin"],
      typicalValues: { carbs: 0, protein: 24, fat: 18, calories: 260, portionGrams: 150 }
    },
    {
      name: "Carne Bovina - Filé Mignon",
      patterns: ["filé mignon", "file mignon", "tenderloin"],
      typicalValues: { carbs: 0, protein: 27, fat: 10, calories: 200, portionGrams: 150 }
    },
    {
      name: "Carne Bovina - Coxão Mole",
      patterns: ["coxão mole", "coxao mole", "top sirloin"],
      typicalValues: { carbs: 0, protein: 25, fat: 12, calories: 210, portionGrams: 150 }
    },
    {
      name: "Carne Moída",
      patterns: ["carne moída", "ground beef", "carne picada"],
      typicalValues: { carbs: 0, protein: 26, fat: 15, calories: 250, portionGrams: 150 }
    },
    {
      name: "Costela",
      patterns: ["costela", "ribs", "costelinha"],
      typicalValues: { carbs: 0, protein: 20, fat: 25, calories: 310, portionGrams: 150 }
    },
    {
      name: "Picanha",
      patterns: ["picanha", "picanha beef"],
      typicalValues: { carbs: 0, protein: 22, fat: 20, calories: 280, portionGrams: 150 }
    },
    
    // ========== AVES ==========
    {
      name: "Peru",
      patterns: ["peru", "turkey", "peru assado"],
      typicalValues: { carbs: 0, protein: 29, fat: 7, calories: 180, portionGrams: 150 }
    },
    {
      name: "Pato",
      patterns: ["pato", "duck", "pato assado"],
      typicalValues: { carbs: 0, protein: 23, fat: 28, calories: 340, portionGrams: 150 }
    },
    {
      name: "Codorna",
      patterns: ["codorna", "quail", "codornas"],
      typicalValues: { carbs: 0, protein: 25, fat: 12, calories: 210, portionGrams: 100 }
    },
    
    // ========== CARNES SUÍNAS ==========
    {
      name: "Lombo Suíno",
      patterns: ["lombo suíno", "pork loin", "lombo de porco"],
      typicalValues: { carbs: 0, protein: 26, fat: 12, calories: 220, portionGrams: 150 }
    },
    {
      name: "Costela Suína",
      patterns: ["costela suína", "pork ribs", "costelinha suína"],
      typicalValues: { carbs: 0, protein: 20, fat: 30, calories: 360, portionGrams: 150 }
    },
    {
      name: "Bisteca Suína",
      patterns: ["bisteca", "pork chop", "bisteca suína"],
      typicalValues: { carbs: 0, protein: 25, fat: 18, calories: 270, portionGrams: 150 }
    },
    {
      name: "Bacon",
      patterns: ["bacon", "bacon crocante"],
      typicalValues: { carbs: 0.5, protein: 12, fat: 42, calories: 420, portionGrams: 30 }
    },
    {
      name: "Linguiça",
      patterns: ["linguiça", "sausage", "linguica", "linguiça toscana"],
      typicalValues: { carbs: 2, protein: 18, fat: 25, calories: 320, portionGrams: 100 }
    },
    
    // ========== PEIXES E FRUTOS DO MAR ==========
    {
      name: "Salmão",
      patterns: ["salmão", "salmon", "salmão grelhado"],
      typicalValues: { carbs: 0, protein: 20, fat: 13, calories: 208, portionGrams: 150 }
    },
    {
      name: "Tilápia",
      patterns: ["tilápia", "tilapia", "tilapia grelhada"],
      typicalValues: { carbs: 0, protein: 24, fat: 2.5, calories: 120, portionGrams: 150 }
    },
    {
      name: "Bacalhau",
      patterns: ["bacalhau", "cod", "bacalhau assado"],
      typicalValues: { carbs: 0, protein: 22, fat: 0.5, calories: 100, portionGrams: 150 }
    },
    {
      name: "Atum",
      patterns: ["atum", "tuna", "atum grelhado"],
      typicalValues: { carbs: 0, protein: 30, fat: 6, calories: 180, portionGrams: 150 }
    },
    {
      name: "Camarão",
      patterns: ["camarão", "shrimp", "camarao"],
      typicalValues: { carbs: 0.5, protein: 24, fat: 1, calories: 106, portionGrams: 100 }
    },
    {
      name: "Lula",
      patterns: ["lula", "squid", "lulas"],
      typicalValues: { carbs: 3, protein: 15, fat: 1.5, calories: 90, portionGrams: 100 }
    },
    {
      name: "Polvo",
      patterns: ["polvo", "octopus"],
      typicalValues: { carbs: 2, protein: 18, fat: 1.5, calories: 100, portionGrams: 100 }
    },
    {
      name: "Sardinha",
      patterns: ["sardinha", "sardine", "sardinhas"],
      typicalValues: { carbs: 0, protein: 25, fat: 10, calories: 200, portionGrams: 100 }
    },
    
    // ========== OVOS ==========
    {
      name: "Ovo Frito",
      patterns: ["ovo frito", "fried egg", "ovo com gema mole"],
      typicalValues: { carbs: 0.5, protein: 6.5, fat: 7, calories: 90, portionGrams: 50 }
    },
    {
      name: "Ovo Cozido",
      patterns: ["ovo cozido", "boiled egg", "ovo cozido inteiro"],
      typicalValues: { carbs: 0.6, protein: 6.3, fat: 4.8, calories: 78, portionGrams: 50 }
    },
    {
      name: "Omelete",
      patterns: ["omelete", "omelet", "omelete de queijo"],
      typicalValues: { carbs: 1, protein: 10, fat: 8, calories: 120, portionGrams: 100 }
    },
    {
      name: "Mexido de Ovos",
      patterns: ["ovo mexido", "scrambled eggs", "ovos mexidos"],
      typicalValues: { carbs: 1, protein: 9, fat: 7, calories: 110, portionGrams: 100 }
    },
    
    // ========== TUBÉRCULOS E RAÍZES ==========
    {
      name: "Batata Inglesa Cozida",
      patterns: ["batata cozida", "boiled potato", "batata inglesa"],
      typicalValues: { carbs: 17, protein: 2, fat: 0.1, calories: 77, portionGrams: 100 }
    },
    {
      name: "Batata Frita",
      patterns: ["batata frita", "fries", "potato chips", "batata palha"],
      typicalValues: { carbs: 41, protein: 3, fat: 15, calories: 312, portionGrams: 100 }
    },
    {
      name: "Batata Doce",
      patterns: ["batata doce", "sweet potato", "batata doce cozida"],
      typicalValues: { carbs: 20, protein: 1.6, fat: 0.1, calories: 86, portionGrams: 100 }
    },
    {
      name: "Purê de Batata",
      patterns: ["purê de batata", "mashed potatoes", "pure de batata"],
      typicalValues: { carbs: 17, protein: 2, fat: 5, calories: 120, portionGrams: 150 }
    },
    {
      name: "Mandioca / Aipim",
      patterns: ["mandioca", "aipim", "cassava", "macaxeira"],
      typicalValues: { carbs: 38, protein: 1.4, fat: 0.3, calories: 160, portionGrams: 100 }
    },
    {
      name: "Mandioca Frita",
      patterns: ["mandioca frita", "aipim frito", "cassava fries"],
      typicalValues: { carbs: 45, protein: 1.5, fat: 12, calories: 300, portionGrams: 100 }
    },
    {
      name: "Inhame",
      patterns: ["inhame", "yam", "cará"],
      typicalValues: { carbs: 24, protein: 1.5, fat: 0.2, calories: 105, portionGrams: 100 }
    },
    {
      name: "Cará",
      patterns: ["cará", "cará"],
      typicalValues: { carbs: 23, protein: 1.3, fat: 0.2, calories: 100, portionGrams: 100 }
    },
    
    // ========== LEGUMES ==========
    {
      name: "Brócolis",
      patterns: ["brócolis", "broccoli", "brocolis"],
      typicalValues: { carbs: 7, protein: 2.8, fat: 0.4, calories: 34, portionGrams: 100 }
    },
    {
      name: "Couve-flor",
      patterns: ["couve-flor", "cauliflower", "couve flor"],
      typicalValues: { carbs: 5, protein: 1.9, fat: 0.3, calories: 25, portionGrams: 100 }
    },
    {
      name: "Cenoura",
      patterns: ["cenoura", "carrot", "cenouras"],
      typicalValues: { carbs: 10, protein: 0.9, fat: 0.2, calories: 41, portionGrams: 80 }
    },
    {
      name: "Abobrinha",
      patterns: ["abobrinha", "zucchini", "abobrinha italiana"],
      typicalValues: { carbs: 3, protein: 1.2, fat: 0.3, calories: 17, portionGrams: 100 }
    },
    {
      name: "Berinjela",
      patterns: ["berinjela", "eggplant"],
      typicalValues: { carbs: 6, protein: 1, fat: 0.2, calories: 25, portionGrams: 100 }
    },
    {
      name: "Pimentão",
      patterns: ["pimentão", "bell pepper", "pimentao"],
      typicalValues: { carbs: 6, protein: 1, fat: 0.3, calories: 31, portionGrams: 80 }
    },
    {
      name: "Tomate",
      patterns: ["tomate", "tomato", "tomates"],
      typicalValues: { carbs: 3.9, protein: 0.9, fat: 0.2, calories: 18, portionGrams: 100 }
    },
    {
      name: "Pepino",
      patterns: ["pepino", "cucumber"],
      typicalValues: { carbs: 3.6, protein: 0.7, fat: 0.1, calories: 15, portionGrams: 100 }
    },
    {
      name: "Abóbora",
      patterns: ["abóbora", "pumpkin", "moranga", "japonesa"],
      typicalValues: { carbs: 7, protein: 1, fat: 0.1, calories: 26, portionGrams: 100 }
    },
    {
      name: "Vagem",
      patterns: ["vagem", "green beans", "vagem"],
      typicalValues: { carbs: 7, protein: 1.8, fat: 0.1, calories: 31, portionGrams: 80 }
    },
    {
      name: "Chuchu",
      patterns: ["chuchu", "chayote"],
      typicalValues: { carbs: 4.5, protein: 0.7, fat: 0.1, calories: 19, portionGrams: 100 }
    },
    {
      name: "Rúcula",
      patterns: ["rúcula", "arugula", "rucula"],
      typicalValues: { carbs: 3.7, protein: 2.6, fat: 0.7, calories: 25, portionGrams: 50 }
    },
    {
      name: "Alface",
      patterns: ["alface", "lettuce", "alface crespa", "alface americana"],
      typicalValues: { carbs: 2.9, protein: 1.4, fat: 0.2, calories: 15, portionGrams: 50 }
    },
    {
      name: "Espinafre",
      patterns: ["espinafre", "spinach"],
      typicalValues: { carbs: 3.6, protein: 2.9, fat: 0.4, calories: 23, portionGrams: 50 }
    },
    {
      name: "Agrião",
      patterns: ["agrião", "watercress", "agriao"],
      typicalValues: { carbs: 1.3, protein: 2.3, fat: 0.1, calories: 11, portionGrams: 50 }
    },
    
    // ========== FRUTAS ==========
    {
      name: "Banana",
      patterns: ["banana", "banana prata", "banana nanica", "banana maçã"],
      typicalValues: { carbs: 23, protein: 1.1, fat: 0.3, calories: 95, portionGrams: 100 }
    },
    {
      name: "Maçã",
      patterns: ["maçã", "apple", "maca"],
      typicalValues: { carbs: 14, protein: 0.3, fat: 0.2, calories: 52, portionGrams: 130 }
    },
    {
      name: "Laranja",
      patterns: ["laranja", "orange"],
      typicalValues: { carbs: 12, protein: 0.9, fat: 0.1, calories: 47, portionGrams: 130 }
    },
    {
      name: "Mamão",
      patterns: ["mamão", "papaya", "mamao"],
      typicalValues: { carbs: 11, protein: 0.5, fat: 0.1, calories: 43, portionGrams: 150 }
    },
    {
      name: "Abacate",
      patterns: ["abacate", "avocado"],
      typicalValues: { carbs: 9, protein: 2, fat: 15, calories: 160, portionGrams: 100 }
    },
    {
      name: "Morango",
      patterns: ["morango", "strawberry", "morangos"],
      typicalValues: { carbs: 7.7, protein: 0.7, fat: 0.3, calories: 32, portionGrams: 100 }
    },
    {
      name: "Uva",
      patterns: ["uva", "grape", "uvas"],
      typicalValues: { carbs: 18, protein: 0.7, fat: 0.2, calories: 69, portionGrams: 100 }
    },
    {
      name: "Melancia",
      patterns: ["melancia", "watermelon"],
      typicalValues: { carbs: 8, protein: 0.6, fat: 0.2, calories: 30, portionGrams: 200 }
    },
    {
      name: "Melão",
      patterns: ["melão", "melon", "melao"],
      typicalValues: { carbs: 9, protein: 0.8, fat: 0.2, calories: 34, portionGrams: 150 }
    },
    {
      name: "Abacaxi",
      patterns: ["abacaxi", "pineapple"],
      typicalValues: { carbs: 13, protein: 0.5, fat: 0.1, calories: 50, portionGrams: 100 }
    },
    {
      name: "Manga",
      patterns: ["manga", "mango"],
      typicalValues: { carbs: 15, protein: 0.8, fat: 0.4, calories: 60, portionGrams: 150 }
    },
    {
      name: "Pera",
      patterns: ["pera", "pear"],
      typicalValues: { carbs: 15, protein: 0.4, fat: 0.1, calories: 57, portionGrams: 140 }
    },
    {
      name: "Kiwi",
      patterns: ["kiwi", "kiwis"],
      typicalValues: { carbs: 14.7, protein: 1.1, fat: 0.5, calories: 61, portionGrams: 100 }
    },
    {
      name: "Goiaba",
      patterns: ["goiaba", "guava"],
      typicalValues: { carbs: 15, protein: 2.6, fat: 0.6, calories: 68, portionGrams: 100 }
    },
    
    // ========== DOCES E SOBREMESAS ==========
    {
      name: "Bolo Simples",
      patterns: ["bolo", "cake", "bolo caseiro", "bolo de fubá", "bolo de laranja"],
      typicalValues: { carbs: 50, protein: 5, fat: 15, calories: 380, portionGrams: 80 }
    },
    {
      name: "Bolo de Chocolate",
      patterns: ["bolo de chocolate", "chocolate cake"],
      typicalValues: { carbs: 55, protein: 6, fat: 18, calories: 420, portionGrams: 80 }
    },
    {
      name: "Pudim",
      patterns: ["pudim", "pudding", "pudim de leite", "pudim de leite condensado"],
      typicalValues: { carbs: 35, protein: 5, fat: 8, calories: 240, portionGrams: 100 }
    },
    {
      name: "Sorvete",
      patterns: ["sorvete", "ice cream", "sorvete de chocolate", "sorvete de creme"],
      typicalValues: { carbs: 25, protein: 3, fat: 12, calories: 220, portionGrams: 100 }
    },
    {
      name: "Brigadeiro",
      patterns: ["brigadeiro", "brigadeiros"],
      typicalValues: { carbs: 12, protein: 1.5, fat: 4, calories: 90, portionGrams: 20 }
    },
    {
      name: "Doce de Leite",
      patterns: ["doce de leite", "dulce de leche"],
      typicalValues: { carbs: 27, protein: 3, fat: 2, calories: 140, portionGrams: 30 }
    },
    {
      name: "Mousse de Maracujá",
      patterns: ["mousse", "mousse de maracujá", "mousse de chocolate"],
      typicalValues: { carbs: 28, protein: 4, fat: 12, calories: 240, portionGrams: 100 }
    },
    {
      name: "Gelatina",
      patterns: ["gelatina", "jelly", "gelatina de morango"],
      typicalValues: { carbs: 15, protein: 2, fat: 0, calories: 70, portionGrams: 100 }
    },
    
    // ========== SALGADOS E PETISCOS ==========
    {
      name: "Coxinha",
      patterns: ["coxinha", "coxinhas", "coxinha de frango"],
      typicalValues: { carbs: 25, protein: 8, fat: 12, calories: 260, portionGrams: 80 }
    },
    {
      name: "Pastel",
      patterns: ["pastel", "pastel de carne", "pastel de queijo", "pastel frito"],
      typicalValues: { carbs: 35, protein: 7, fat: 18, calories: 360, portionGrams: 100 }
    },
    {
      name: "Empada",
      patterns: ["empada", "empadas", "empadinha"],
      typicalValues: { carbs: 22, protein: 6, fat: 14, calories: 250, portionGrams: 70 }
    },
    {
      name: "Quibe",
      patterns: ["quibe", "kibe", "quibe frito", "quibe assado"],
      typicalValues: { carbs: 18, protein: 10, fat: 12, calories: 230, portionGrams: 80 }
    },
    {
      name: "Esfiha",
      patterns: ["esfiha", "esfiha de carne", "esfirra"],
      typicalValues: { carbs: 28, protein: 8, fat: 10, calories: 240, portionGrams: 70 }
    },
    {
      name: "Pizza",
      patterns: ["pizza", "pizza de mussarela", "pizza de calabresa"],
      typicalValues: { carbs: 33, protein: 12, fat: 10, calories: 285, portionGrams: 100 }
    },
    {
      name: "Hambúrguer",
      patterns: ["hambúrguer", "burger", "hamburger", "sanduíche", "x-burger"],
      typicalValues: { carbs: 35, protein: 25, fat: 20, calories: 450, portionGrams: 200 }
    },
    {
      name: "Hot Dog",
      patterns: ["hot dog", "cachorro quente", "hotdog"],
      typicalValues: { carbs: 34, protein: 12, fat: 18, calories: 350, portionGrams: 150 }
    },
    
    // ========== LATICÍNIOS ==========
    {
      name: "Queijo Mussarela",
      patterns: ["queijo mussarela", "muçarela", "mozzarella"],
      typicalValues: { carbs: 2, protein: 22, fat: 20, calories: 280, portionGrams: 50 }
    },
    {
      name: "Queijo Prato",
      patterns: ["queijo prato", "prato cheese"],
      typicalValues: { carbs: 1.5, protein: 24, fat: 22, calories: 310, portionGrams: 50 }
    },
    {
      name: "Queijo Minas",
      patterns: ["queijo minas", "minas cheese", "queijo frescal"],
      typicalValues: { carbs: 2, protein: 18, fat: 12, calories: 200, portionGrams: 50 }
    },
    {
      name: "Queijo Parmesão",
      patterns: ["queijo parmesão", "parmesan", "parmesão ralado"],
      typicalValues: { carbs: 3, protein: 35, fat: 25, calories: 400, portionGrams: 30 }
    },
    {
      name: "Iogurte Natural",
      patterns: ["iogurte", "yogurt", "iogurte natural", "yogurte"],
      typicalValues: { carbs: 10, protein: 5, fat: 3, calories: 90, portionGrams: 170 }
    },
    {
      name: "Iogurte Grego",
      patterns: ["iogurte grego", "greek yogurt"],
      typicalValues: { carbs: 8, protein: 10, fat: 5, calories: 120, portionGrams: 170 }
    },
    {
      name: "Leite Integral",
      patterns: ["leite integral", "milk", "leite de vaca"],
      typicalValues: { carbs: 4.8, protein: 3.2, fat: 3.2, calories: 60, portionGrams: 200 }
    },
    {
      name: "Leite Desnatado",
      patterns: ["leite desnatado", "skim milk"],
      typicalValues: { carbs: 5, protein: 3.5, fat: 0.3, calories: 35, portionGrams: 200 }
    },
    
    // ========== BEBIDAS ==========
    {
      name: "Refrigerante",
      patterns: ["refrigerante", "soda", "coca-cola", "guaraná", "fanta"],
      typicalValues: { carbs: 25, protein: 0, fat: 0, calories: 100, portionGrams: 250 }
    },
    {
      name: "Refrigerante Zero",
      patterns: ["refrigerante zero", "diet soda", "coca zero", "guaraná zero"],
      typicalValues: { carbs: 0, protein: 0, fat: 0, calories: 0, portionGrams: 250 }
    },
    {
      name: "Suco Natural",
      patterns: ["suco natural", "fresh juice", "suco de laranja", "suco de limão"],
      typicalValues: { carbs: 22, protein: 0.5, fat: 0.1, calories: 90, portionGrams: 250 }
    },
    {
      name: "Suco de Caixinha",
      patterns: ["suco de caixinha", "box juice", "suco industrializado"],
      typicalValues: { carbs: 28, protein: 0.5, fat: 0, calories: 110, portionGrams: 200 }
    },
    {
      name: "Água de Coco",
      patterns: ["água de coco", "coconut water"],
      typicalValues: { carbs: 5, protein: 0.5, fat: 0, calories: 22, portionGrams: 250 }
    },
    {
      name: "Café",
      patterns: ["café", "coffee", "cafezinho", "café preto"],
      typicalValues: { carbs: 0, protein: 0, fat: 0, calories: 2, portionGrams: 100 }
    },
    {
      name: "Chá",
      patterns: ["chá", "tea", "chá mate", "chá verde", "chá de camomila"],
      typicalValues: { carbs: 0, protein: 0, fat: 0, calories: 2, portionGrams: 200 }
    },
    
    // ========== MOLHOS E CONDIMENTOS ==========
    {
      name: "Maionese",
      patterns: ["maionese", "mayonnaise"],
      typicalValues: { carbs: 1, protein: 0.5, fat: 75, calories: 680, portionGrams: 15 }
    },
    {
      name: "Ketchup",
      patterns: ["ketchup", "catchup"],
      typicalValues: { carbs: 27, protein: 1, fat: 0.2, calories: 112, portionGrams: 15 }
    },
    {
      name: "Mostarda",
      patterns: ["mostarda", "mustard"],
      typicalValues: { carbs: 5, protein: 1.5, fat: 1, calories: 36, portionGrams: 15 }
    },
    {
      name: "Molho Barbecue",
      patterns: ["barbecue", "molho barbecue", "bbq"],
      typicalValues: { carbs: 35, protein: 1, fat: 0.5, calories: 145, portionGrams: 30 }
    },
    {
      name: "Azeite de Oliva",
      patterns: ["azeite", "olive oil", "azeite de oliva"],
      typicalValues: { carbs: 0, protein: 0, fat: 100, calories: 884, portionGrams: 10 }
    },
    {
      name: "Manteiga",
      patterns: ["manteiga", "butter"],
      typicalValues: { carbs: 0, protein: 0.5, fat: 81, calories: 717, portionGrams: 10 }
    },
    {
      name: "Margarina",
      patterns: ["margarina", "margarine"],
      typicalValues: { carbs: 0, protein: 0, fat: 80, calories: 720, portionGrams: 10 }
    },
    
    // ========== PÃES E SANDUÍCHES ==========
    {
      name: "Sanduíche Natural",
      patterns: ["sanduíche natural", "sandwich natural", "sanduíche de frango"],
      typicalValues: { carbs: 30, protein: 15, fat: 8, calories: 250, portionGrams: 150 }
    },
    {
      name: "Wrap",
      patterns: ["wrap", "wraps", "wrap de frango"],
      typicalValues: { carbs: 35, protein: 20, fat: 12, calories: 340, portionGrams: 180 }
    },
    {
      name: "Tapioca",
      patterns: ["tapioca", "tapioca de queijo", "tapioca de coco"],
      typicalValues: { carbs: 40, protein: 1.5, fat: 2, calories: 180, portionGrams: 100 }
    },
    {
      name: "Crepioca",
      patterns: ["crepioca", "crepioca de frango"],
      typicalValues: { carbs: 20, protein: 10, fat: 8, calories: 200, portionGrams: 100 }
    },
    
    // ========== ALIMENTOS FITNESS ==========
    {
      name: "Peito de Peru",
      patterns: ["peito de peru", "turkey breast", "peru defumado"],
      typicalValues: { carbs: 1, protein: 27, fat: 2, calories: 135, portionGrams: 100 }
    },
    {
      name: "Ricota",
      patterns: ["ricota", "ricotta cheese"],
      typicalValues: { carbs: 3, protein: 11, fat: 9, calories: 137, portionGrams: 100 }
    },
    {
      name: "Cottage",
      patterns: ["cottage", "queijo cottage"],
      typicalValues: { carbs: 3, protein: 11, fat: 4, calories: 98, portionGrams: 100 }
    },
    {
      name: "Whey Protein",
      patterns: ["whey", "whey protein", "shake de whey"],
      typicalValues: { carbs: 3, protein: 24, fat: 1.5, calories: 120, portionGrams: 30 }
    },
    {
      name: "Tofu",
      patterns: ["tofu", "queijo de soja"],
      typicalValues: { carbs: 2, protein: 8, fat: 4, calories: 76, portionGrams: 100 }
    },
    
    // ========== COMIDAS TÍPICAS BRASILEIRAS ==========
    {
      name: "Feijoada",
      patterns: ["feijoada", "feijoada completa"],
      typicalValues: { carbs: 15, protein: 18, fat: 15, calories: 280, portionGrams: 250 }
    },
    {
      name: "Moqueca",
      patterns: ["moqueca", "moqueca baiana", "moqueca de peixe"],
      typicalValues: { carbs: 8, protein: 22, fat: 18, calories: 300, portionGrams: 250 }
    },
    {
      name: "Vatapá",
      patterns: ["vatapá", "vatapa"],
      typicalValues: { carbs: 12, protein: 8, fat: 20, calories: 280, portionGrams: 100 }
    },
    {
      name: "Acarajé",
      patterns: ["acarajé", "acaraje"],
      typicalValues: { carbs: 35, protein: 10, fat: 25, calories: 400, portionGrams: 100 }
    },
    {
      name: "Pão de Queijo",
      patterns: ["pão de queijo", "pao de queijo", "cheese bread"],
      typicalValues: { carbs: 28, protein: 6, fat: 12, calories: 250, portionGrams: 50 }
    }
  ],
  
  // ============================================
  // REGRAS DE PORÇÃO (em gramas)
  // ============================================
  portionRules: {
    "mão inteira": 150,
    "tamanho da mão": 100,
    "punho fechado": 150,
    "palma da mão": 120,
    "polegar": 30,
    "duas colheres": 30,
    "colher de sopa": 15,
    "colher de chá": 5,
    "xícara de chá": 200,
    "xícara de café": 100,
    "copo americano": 200,
    "copo requeijão": 250,
    "prato de sobremesa": 200,
    "prato pequeno": 250,
    "prato grande": 400,
    "bowl pequeno": 300,
    "bowl médio": 450,
    "tigela": 350,
    "fatia fina": 50,
    "fatia média": 80,
    "fatia grossa": 120
  },
  
  // ============================================
  // CATEGORIAS E AJUSTES
  // ============================================
  categories: {
    "carnes": { multiplier: 1.0, desc: "Fontes de proteína" },
    "carboidratos": { multiplier: 1.0, desc: "Fontes de energia" },
    "leguminosas": { multiplier: 0.9, desc: "Proteínas vegetais" },
    "vegetais": { multiplier: 0.8, desc: "Vitaminas e fibras" },
    "frutas": { multiplier: 0.9, desc: "Vitaminas e fibras" },
    "doces": { multiplier: 1.2, desc: "Consumo moderado" },
    "frituras": { multiplier: 1.3, desc: "Alto teor calórico" },
    "bebidas": { multiplier: 1.0, desc: "Hidratação" }
  },
  
  // ============================================
  // PROMPT BASE PARA A IA
  // ============================================
  systemPrompt: `Você é um nutricionista especializado em análise de alimentos por foto.

REGRAS:
1. Identifique TODOS os alimentos visíveis na imagem
2. Para cada alimento, estime a PORÇÃO em gramas baseado no tamanho do prato/utensílios
3. Use a TABELA DE REFERÊNCIA abaixo para valores nutricionais
4. Se o alimento não estiver na tabela, faça uma estimativa baseada em alimentos similares
5. Sempre responda no formato JSON especificado

TABELA DE REFERÊNCIA (use ESTES VALORES EXATOS quando encontrar o alimento):
${JSON.stringify(this?.knownFoods || [], null, 2)}

Responda APENAS com JSON válido neste formato:
{
  "foods": [
    {
      "foodName": "Nome do alimento",
      "carbs": 0,
      "protein": 0,
      "fat": 0,
      "calories": 0,
      "portionGrams": 0,
      "confidence": "high"
    }
  ],
  "totalMeal": {
    "carbs": 0,
    "protein": 0,
    "fat": 0,
    "calories": 0
  }
}`,

  // ============================================
  // FUNÇÃO PARA COMPARAR COM O SCRIPT
  // ============================================
  compareWithScript: (identifiedFood) => {
    // Busca exata por nome
    let matchedFood = FOOD_SCRIPT_RULES.knownFoods.find(food => 
      food.name.toLowerCase() === identifiedFood.foodName?.toLowerCase()
    );
    
    // Se não achou, busca por padrões
    if (!matchedFood) {
      matchedFood = FOOD_SCRIPT_RULES.knownFoods.find(food => 
        food.patterns.some(pattern => 
          identifiedFood.foodName?.toLowerCase().includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(identifiedFood.foodName?.toLowerCase())
        )
      );
    }
    
    if (matchedFood) {
      return {
        found: true,
        matchedRule: matchedFood.name,
        suggestedValues: matchedFood.typicalValues,
        message: `✅ Sistema identificou: ${matchedFood.name} - Dados nutricionais carregados do script!`
      };
    }
    
    return {
      found: false,
      matchedRule: null,
      suggestedValues: null,
      message: `⚠️ Alimento não encontrado no script. Usando estimativa da IA.`
    };
  },
  
  // ============================================
  // FUNÇÃO PARA BUSCAR ALIMENTO POR NOME
  // ============================================
  searchFood: (foodName) => {
    const normalized = foodName.toLowerCase().trim();
    
    return FOOD_SCRIPT_RULES.knownFoods.filter(food => 
      food.name.toLowerCase().includes(normalized) ||
      food.patterns.some(pattern => pattern.toLowerCase().includes(normalized))
    );
  },
  
  // ============================================
  // FUNÇÃO PARA OBTER ALIMENTO POR CATEGORIA
  // ============================================
  getFoodsByCategory: (category) => {
    // Mapeamento aproximado de categorias
    const categoryMappings = {
      carnes: ["Frango", "Carne", "Peru", "Pato", "Codorna", "Lombo", "Costela", "Bisteca", "Bacon", "Linguiça"],
      frutas: ["Banana", "Maçã", "Laranja", "Mamão", "Abacate", "Morango", "Uva", "Melancia", "Melão", "Abacaxi", "Manga", "Pera", "Kiwi", "Goiaba"],
      legumes: ["Brócolis", "Couve-flor", "Cenoura", "Abobrinha", "Berinjela", "Pimentão", "Tomate", "Pepino", "Abóbora", "Vagem", "Chuchu"],
      verduras: ["Rúcula", "Alface", "Espinafre", "Agrião", "Salada Verde"],
      tuberculos: ["Batata", "Mandioca", "Inhame", "Cará", "Batata Doce"],
      doces: ["Bolo", "Pudim", "Sorvete", "Brigadeiro", "Doce de Leite", "Mousse", "Gelatina"],
      salgados: ["Coxinha", "Pastel", "Empada", "Quibe", "Esfiha", "Pizza", "Hambúrguer", "Hot Dog"],
      proteinas: ["Ovo", "Peixe", "Frango", "Carne", "Tofu", "Whey", "Peito de Peru"],
      carboidratos: ["Arroz", "Macarrão", "Pão", "Aveia", "Quinoa", "Cuscuz", "Batata"]
    };
    
    return FOOD_SCRIPT_RULES.knownFoods.filter(food => 
      categoryMappings[category]?.some(term => food.name.includes(term))
    );
  }
};

// Export individual functions for convenience
export const searchFood = (foodName) => FOOD_SCRIPT_RULES.searchFood(foodName);
export const getFoodsByCategory = (category) => FOOD_SCRIPT_RULES.getFoodsByCategory(category);
export const compareWithScript = (identifiedFood) => FOOD_SCRIPT_RULES.compareWithScript(identifiedFood);