require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fetch = require('node-fetch');
const schedule = require('node-schedule');

const bot = new Telegraf(process.env.BOT_TOKEN);

let pincode;
let age;
let vaccine;
let dose;

let job;

const notify = async (ctx) => {
  job = schedule.scheduleJob('*/6 * * * * *', async () => {
    const sessions = await fetchSlots();

    sessions.map((session) => {
      ctx.reply(
        `Pincode: ${session.pincode}, ${session.district_name}

Age Group: ${session.min_age_limit}+

Center Name: ${session.name}
Address: ${session.address}
Date: ${session.date}

Total Dose Available: ${session.available_capacity}
${
  dose === 1
    ? `Dose 1 Available Capacity: ${session.available_capacity_dose1}`
    : `Dose 2 Available Capacity: ${session.available_capacity_dose2}`
}

Vaccine: ${session.vaccine}
Fee: ${
          session.fee_type === 'Free' || session.fee === '0'
            ? 'Free'
            : '₹ ' + session.fee
        }`
      );
    });
  });
};

const fetchSlots = async () => {
  let today = new Date();
  const dd = today.getDate().toString().padStart(2, '0');
  const mm = (today.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = today.getFullYear();
  today = `${dd}-${mm}-${yyyy}`;

  const { sessions } = await fetch(
    `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByPin?pincode=${pincode}&date=${today}`
  ).then((response) => response.json());

  let filteredSessions = sessions.filter(
    (session) => session.available_capacity > 0
  );

  if (age) {
    filteredSessions = filteredSessions.filter(
      (session) => session.min_age_limit === age
    );
  }

  if (vaccine) {
    filteredSessions = filteredSessions.filter(
      (session) => session.vaccine === vaccine
    );
  }

  if (dose) {
    filteredSessions =
      dose === 1
        ? filteredSessions.filter(
            (session) => session.available_capacity_dose1 > 0
          )
        : filteredSessions.filter(
            (session) => session.available_capacity_dose2 > 0
          );
  }

  return filteredSessions;
};

bot.start((ctx) => {
  ctx.reply('How to get started guide');
  // TODO: Add description of how to get started
});

bot.command('setpincode', (ctx) => {
  ctx.reply('Enter your pincode');

  bot.hears(/^[1-9][0-9]{5}$/, (ctx) => {
    pincode = ctx.message.text;
  });
});

bot.command('setage', (ctx) => {
  ctx.reply(
    'Choose your age group',
    Markup.keyboard([['18+', '45+']])
      .oneTime()
      .resize()
  );

  bot.hears('18+', () => {
    age = 18;
  });

  bot.hears('45+', () => {
    age = 45;
  });
});

bot.command('setvaccine', (ctx) => {
  ctx.reply(
    'Choose your preffered vaccine',
    Markup.keyboard([['COVISHIELD', 'COVAXIN', 'SPUTNIK V']])
      .oneTime()
      .resize()
  );

  bot.hears('COVISHIELD', () => {
    vaccine = 'COVISHIELD';
  });

  bot.hears('COVAXIN', () => {
    vaccine = 'COVAXIN';
  });

  bot.hears('SPUTNIK V', () => {
    vaccine = 'SPUTNIK V';
  });
});

bot.command('setdose', (ctx) => {
  ctx.reply(
    'Choose your dose',
    Markup.keyboard([['Dose 1', 'Dose 2']])
      .oneTime()
      .resize()
  );

  bot.hears('Dose 1', () => {
    dose = 1;
  });

  bot.hears('Dose 2', () => {
    dose = 2;
  });
});

bot.command('notify', (ctx) => {
  pincode
    ? notify(ctx)
    : ctx.reply('Please set pincode using /setpincode command');
});

bot.command('stop', (ctx) => {
  ctx.reply('All notifications stopped');
  job.cancel();
});

bot.launch();
