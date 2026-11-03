package pe.runrun.cotizador;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Funciones propias del taller: imprimir/guardar PDF y abrir WhatsApp u otros enlaces.
        registerPlugin(TallerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
