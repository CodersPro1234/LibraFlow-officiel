require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./models/Book');

const books = [
  // Informatique (6)
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    isbn: '9780132350884',
    genre: 'Informatique',
    description: 'Bonnes pratiques pour écrire du code lisible et maintenable.',
    totalCopies: 5,
    availableCopies: 5,
    publishedYear: 2008,
    publisher: 'Prentice Hall',
  },
  {
    title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
    author: 'Erich Gamma et al.',
    isbn: '9780201633610',
    genre: 'Informatique',
    description: 'Catalogue de motifs de conception pour l’orientation objet.',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 1994,
    publisher: 'Addison-Wesley',
  },
  {
    title: 'Introduction to Algorithms',
    author: 'T. H. Cormen et al.',
    isbn: '9780262033848',
    genre: 'Informatique',
    description: 'Référence complète sur les algorithmes et structures de données.',
    totalCopies: 4,
    availableCopies: 4,
    publishedYear: 2009,
    publisher: 'MIT Press',
  },
  {
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt, David Thomas',
    isbn: '9780201616224',
    genre: 'Informatique',
    description: 'Conseils pratiques pour les développeurs logiciels.',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 1999,
    publisher: 'Addison-Wesley',
  },
  {
    title: 'You Don’t Know JS Yet',
    author: 'Kyle Simpson',
    isbn: '9781091210099',
    genre: 'Informatique',
    description: 'Série approfondie sur le langage JavaScript.',
    totalCopies: 2,
    availableCopies: 2,
    publishedYear: 2020,
    publisher: 'Indépendant',
  },
  {
    title: 'Python Crash Course',
    author: 'Eric Matthes',
    isbn: '9781593276034',
    genre: 'Informatique',
    description: 'Introduction pratique à Python et à la programmation.',
    totalCopies: 4,
    availableCopies: 4,
    publishedYear: 2015,
    publisher: 'No Starch Press',
  },

  // Mathématiques (5)
  {
    title: 'Calculus: Early Transcendentals',
    author: 'James Stewart',
    isbn: '9781285741550',
    genre: 'Mathématiques',
    description: 'Cours complet de calcul différentiel et intégral.',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 2015,
    publisher: 'Cengage',
  },
  {
    title: 'Linear Algebra Done Right',
    author: 'Sheldon Axler',
    isbn: '9783319110790',
    genre: 'Mathématiques',
    description: 'Approche conceptuelle de l’algèbre linéaire.',
    totalCopies: 2,
    availableCopies: 2,
    publishedYear: 2015,
    publisher: 'Springer',
  },
  {
    title: 'Probability and Statistics',
    author: 'Morris H. DeGroot, Mark J. Schervish',
    isbn: '9780321500465',
    genre: 'Mathématiques',
    description: 'Introduction à la probabilité et à la statistique.',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 2011,
    publisher: 'Pearson',
  },
  {
    title: 'Discrete Mathematics and Its Applications',
    author: 'Kenneth H. Rosen',
    isbn: '9780073383095',
    genre: 'Mathématiques',
    description: 'Référence pour les mathématiques discrètes.',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 2011,
    publisher: 'McGraw-Hill',
  },
  {
    title: 'Introduction to Linear Optimization',
    author: 'Dimitris Bertsimas, John N. Tsitsiklis',
    isbn: '9781886529199',
    genre: 'Mathématiques',
    description: 'Base de l’optimisation linéaire et de la recherche opérationnelle.',
    totalCopies: 2,
    availableCopies: 2,
    publishedYear: 1997,
    publisher: 'Athena Scientific',
  },

  // Sciences (5)
  {
    title: 'Physics for Scientists and Engineers',
    author: 'Raymond A. Serway, John W. Jewett',
    isbn: '9781133947271',
    genre: 'Sciences',
    description: 'Cours de base de physique pour les scientifiques et ingénieurs.',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 2013,
    publisher: 'Cengage',
  },
  {
    title: 'Fundamentals of Thermodynamics',
    author: 'Claus Borgnakke, Richard E. Sonntag',
    isbn: '9780470041925',
    genre: 'Sciences',
    description: 'Introduction détaillée à la thermodynamique classique.',
    totalCopies: 2,
    availableCopies: 2,
    publishedYear: 2008,
    publisher: 'Wiley',
  },
  {
    title: 'Organic Chemistry',
    author: 'Paula Yurkanis Bruice',
    isbn: '9780134042282',
    genre: 'Sciences',
    description: 'Cours complet de chimie organique.',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 2014,
    publisher: 'Pearson',
  },
  {
    title: 'Modern Biology',
    author: 'Holt, Rinehart and Winston',
    isbn: '9780030367694',
    genre: 'Sciences',
    description: 'Introduction aux concepts fondamentaux de la biologie.',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 2006,
    publisher: 'Holt',
  },
  {
    title: 'Introduction to Environmental Engineering',
    author: 'Mackenzie L. Davis',
    isbn: '9780073401140',
    genre: 'Sciences',
    description: 'Principes de base de l’ingénierie environnementale.',
    totalCopies: 2,
    availableCopies: 2,
    publishedYear: 2012,
    publisher: 'McGraw-Hill',
  },

  // Gestion (4)
  {
    title: 'Principles of Marketing',
    author: 'Philip Kotler, Gary Armstrong',
    isbn: '9781292092485',
    genre: 'Gestion',
    description: 'Concepts clés du marketing moderne.',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 2015,
    publisher: 'Pearson',
  },
  {
    title: 'Financial Management: Theory & Practice',
    author: 'Eugene F. Brigham, Michael C. Ehrhardt',
    isbn: '9781112147125',
    genre: 'Gestion',
    description: 'Référence sur la gestion financière des entreprises.',
    totalCopies: 2,
    availableCopies: 2,
    publishedYear: 2013,
    publisher: 'Cengage',
  },
  {
    title: 'Operations Management',
    author: 'Jay Heizer, Barry Render',
    isbn: '9780132921145',
    genre: 'Gestion',
    description: 'Fondamentaux de la gestion des opérations.',
    totalCopies: 2,
    availableCopies: 2,
    publishedYear: 2013,
    publisher: 'Pearson',
  },
  {
    title: 'Project Management: A Systems Approach',
    author: 'Harold Kerzner',
    isbn: '9781118022273',
    genre: 'Gestion',
    description: 'Gestion de projet orientée systèmes.',
    totalCopies: 2,
    availableCopies: 2,
    publishedYear: 2013,
    publisher: 'Wiley',
  },

  // Littérature (4)
  {
    title: 'Les Misérables',
    author: 'Victor Hugo',
    isbn: '9782070409189',
    genre: 'Littérature',
    description: 'Classique de la littérature française.',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 1862,
    publisher: 'Gallimard',
  },
  {
    title: 'Things Fall Apart',
    author: 'Chinua Achebe',
    isbn: '9780385474542',
    genre: 'Littérature',
    description: 'Roman majeur de la littérature africaine moderne.',
    totalCopies: 2,
    availableCopies: 2,
    publishedYear: 1958,
    publisher: 'Anchor Books',
  },
  {
    title: 'L’Étranger',
    author: 'Albert Camus',
    isbn: '9782070360022',
    genre: 'Littérature',
    description: 'Roman philosophique emblématique du XXe siècle.',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 1942,
    publisher: 'Gallimard',
  },
  {
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '9780061120084',
    genre: 'Littérature',
    description: 'Roman sur la justice et les inégalités dans le sud des États-Unis.',
    totalCopies: 2,
    availableCopies: 2,
    publishedYear: 1960,
    publisher: 'HarperCollins',
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connecté');

    await Book.deleteMany({});
    console.log('🗑️  Anciens livres supprimés');

    const created = await Book.insertMany(books);
    console.log(`📚 ${created.length} livres créés avec succès !`);

    console.log('\nExemples de catégories présentes :');
    console.log('  - Informatique');
    console.log('  - Mathématiques');
    console.log('  - Sciences');
    console.log('  - Gestion');
    console.log('  - Littérature');
    console.log('  - Autre (par défaut si besoin)\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
};

seed();

