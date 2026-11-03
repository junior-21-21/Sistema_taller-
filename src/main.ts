import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { prepareNative } from './app/core/native';

// En la APK primero se recupera la copia guardada en el celular; luego arranca el sistema.
prepareNative().finally(() => bootstrapApplication(App, appConfig).catch((err) => console.error(err)));
