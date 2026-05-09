#!/usr/bin/env node
/**
 * audit-dgt-signs.js
 *
 * Сравнивает текущую БД (road_signs) с официальным каталогом DGT.
 * Источники: Wikipedia Anexo (R/P/S/T-series) + Manual DGT 2025/2026.
 * READ-ONLY — ничего в БД не пишет.
 *
 * Запуск: node scripts/audit-dgt-signs.js
 * Результат: audit-report.md + STDOUT-сводка
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = 'https://yffjnqegeiorunyvcxkn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Нужен SUPABASE_SERVICE_ROLE_KEY или VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL LIST — Official DGT 2025/2026 catalogue
// Sources:
//   https://es.wikipedia.org/wiki/Anexo:Señales_de_tráfico_de_reglamentación_de_España
//   https://es.wikipedia.org/wiki/Anexo:Señales_de_tráfico_de_peligro_de_España
//   https://es.wikipedia.org/wiki/Anexo:Señales_de_tráfico_de_indicación_de_España
//   https://es.wikipedia.org/wiki/Anexo:Señales_de_tráfico_de_obras_de_España
//   Manual I — Normas y Señales DGT 2025
// ─────────────────────────────────────────────────────────────────────────────
const CANONICAL = {
  // ── R-series: Señales de reglamentación ──────────────────────────────────
  'R-1':    'Ceda el paso',
  'R-2':    'Detención obligatoria (STOP)',
  'R-3':    'Calzada con prioridad',
  'R-4':    'Fin de prioridad',
  'R-5':    'Prioridad en sentido contrario',
  'R-6':    'Prioridad respecto al sentido contrario',
  'R-100':  'Circulación prohibida',
  'R-101':  'Entrada prohibida',
  'R-102':  'Entrada prohibida a vehículos de motor',
  'R-103':  'Entrada prohibida a vehículos de motor, excepto motocicletas de dos ruedas',
  'R-104':  'Entrada prohibida a motocicletas',
  'R-105':  'Entrada prohibida a ciclomotores',
  'R-106':  'Entrada prohibida a vehículos destinados al transporte de mercancías',
  'R-107':  'Entrada prohibida a vehículos destinados al transporte de mercancías con mayor masa autorizada',
  'R-108':  'Entrada prohibida a vehículos que transporten mercancías peligrosas',
  'R-109':  'Entrada prohibida a vehículos que transporten mercancías explosivas o inflamables',
  'R-110':  'Entrada prohibida a vehículos que transporten productos contaminantes del agua',
  'R-111':  'Entrada prohibida a vehículos agrícolas de motor',
  'R-112':  'Entrada prohibida a vehículos de motor con remolque',
  'R-113':  'Entrada prohibida a vehículos de tracción animal',
  'R-114':  'Entrada prohibida a ciclos',
  'R-115':  'Entrada prohibida a carros de mano',
  'R-116':  'Entrada prohibida a peatones',
  'R-117':  'Entrada prohibida a animales de montura',
  'R-118':  'Entrada prohibida a vehículos de movilidad personal',
  'R-119':  'Entrada prohibida a vehículos de movilidad personal y ciclos',
  'R-120':  'Entrada prohibida a vehículos en función de distintivo ambiental',
  'R-200':  'Prohibición de pasar sin detenerse',
  'R-201':  'Limitación de masa',
  'R-202':  'Limitación de masa por eje',
  'R-203':  'Limitación de longitud',
  'R-204':  'Limitación de anchura',
  'R-205':  'Limitación de altura',
  'R-300':  'Separación mínima',
  'R-301':  'Velocidad máxima',
  'R-302':  'Giro a la derecha prohibido',
  'R-303':  'Giro a la izquierda prohibido',
  'R-304':  'Media vuelta prohibida',
  'R-305':  'Adelantamiento prohibido',
  'R-306':  'Adelantamiento prohibido para camiones',
  'R-307':  'Parada y estacionamiento prohibido',
  'R-307a': 'Parada y estacionamiento prohibido hacia ambos lados',
  'R-307b': 'Parada y estacionamiento prohibido hacia un lado (par)',
  'R-307c': 'Parada y estacionamiento prohibido hacia un lado (impar)',
  'R-308':  'Estacionamiento prohibido',
  'R-308c': 'Estacionamiento prohibido la primera quincena',
  'R-308d': 'Estacionamiento prohibido la segunda quincena',
  'R-308e': 'Estacionamiento prohibido en vado',
  'R-308f': 'Estacionamiento prohibido hacia ambos lados',
  'R-308g': 'Estacionamiento prohibido hacia un lado (par)',
  'R-308h': 'Estacionamiento prohibido hacia un lado (impar)',
  'R-309':  'Zona de estacionamiento limitado',
  'R-310':  'Advertencias acústicas prohibidas',
  'R-400a': 'Sentido obligatorio (recto)',
  'R-400b': 'Sentido obligatorio (derecha)',
  'R-400c': 'Sentido obligatorio (izquierda)',
  'R-400d': 'Sentido obligatorio (recto o derecha)',
  'R-400e': 'Sentido obligatorio (recto o izquierda)',
  'R-401a': 'Paso obligatorio (derecha)',
  'R-401b': 'Paso obligatorio (izquierda)',
  'R-401c': 'Paso obligatorio',
  'R-402':  'Rotonda obligatoria',
  'R-403a': 'Únicas direcciones y sentidos permitidos',
  'R-403b': 'Únicas direcciones y sentidos permitidos',
  'R-403c': 'Únicas direcciones y sentidos permitidos',
  'R-404':  'Calzada obligatoria para automóviles',
  'R-405':  'Calzada obligatoria para motocicletas de dos ruedas',
  'R-406':  'Calzada obligatoria para camiones',
  'R-407a': 'Vía obligatoria y reservada para ciclos',
  'R-407b': 'Vía obligatoria y reservada para ciclomotores',
  'R-408':  'Camino obligatorio para vehículos de tracción animal',
  'R-409':  'Camino obligatorio y reservado para animales de montura',
  'R-410':  'Camino reservado para peatones',
  'R-411':  'Velocidad mínima',
  'R-412':  'Obligatorio usar cadenas para nieve',
  'R-412b': 'Obligatorio usar neumáticos especiales de invierno',
  'R-413':  'Alumbrado de corto alcance obligatorio',
  'R-414':  'Calzada obligatoria para vehículos que transporten mercancías peligrosas',
  'R-415':  'Calzada obligatoria para vehículos que transporten productos contaminantes del agua',
  'R-416':  'Calzada obligatoria para vehículos que transporten materias explosivas o inflamables',
  'R-417':  'Uso obligatorio del cinturón de seguridad',
  'R-418':  'Vía exclusiva para vehículos con telepeaje operativo',
  'R-419':  'Camino obligatorio a tractores',
  'R-420':  'Vía reservada y obligatoria para vehículos de movilidad personal',
  'R-421':  'Vía reservada y obligatoria para ciclos y vehículos de movilidad personal',
  'R-422':  'Obligatorio desmontar y continuar a pie',
  'R-500':  'Fin de prohibiciones',
  'R-501':  'Fin de la limitación de velocidad',
  'R-502':  'Fin de la prohibición de adelantamiento',
  'R-503':  'Fin de la prohibición de adelantamiento para camiones',
  'R-504':  'Fin de zona de estacionamiento limitado',
  'R-505':  'Fin de vía reservada y obligatoria para ciclos',
  'R-506':  'Fin de velocidad mínima',
  'R-507':  'Fin de vía obligatoria para automóviles',
  'R-508':  'Fin de vía obligatoria para motocicletas de dos ruedas',
  'R-509':  'Fin de vía obligatoria para camiones, tractocamiones y furgones',
  'R-510':  'Fin de vía reservada y obligatoria para ciclomotores',
  'R-511':  'Fin de camino obligatorio para vehículos de tracción animal',
  'R-512':  'Fin de camino reservado y obligatorio para animales de montura',
  'R-513':  'Fin de camino reservado y obligatorio para peatones',
  'R-514':  'Fin de camino obligatorio a tractores',
  'R-515':  'Fin de vía reservada y obligatoria para vehículos de movilidad personal',
  'R-516':  'Fin de vía reservada y obligatoria para ciclos y vehículos de movilidad personal',

  // ── P-series: Señales de peligro ─────────────────────────────────────────
  'P-1':    'Intersección con prioridad',
  'P-1a':   'Intersección con prioridad sobre vía a la derecha',
  'P-1b':   'Intersección con prioridad sobre vía a la izquierda',
  'P-1c':   'Intersección con prioridad sobre la incorporación por la derecha',
  'P-1d':   'Intersección con prioridad sobre la incorporación por la izquierda',
  'P-1e':   'Tramo con accesos directos',
  'P-2':    'Intersección con prioridad de la derecha',
  'P-3':    'Semáforos',
  'P-4':    'Intersección con circulación glorieta',
  'P-5':    'Puente móvil',
  'P-6':    'Cruce de tranvía',
  'P-7':    'Paso a nivel con barreras',
  'P-8':    'Paso a nivel sin barreras',
  'P-9a':   'Proximidad de un paso a nivel o de un puente móvil (lado derecho)',
  'P-9b':   'Aproximación de un paso a nivel o de un puente móvil (lado derecho)',
  'P-9c':   'Cercanía de un paso a nivel o de un puente móvil (lado derecho)',
  'P-10a':  'Proximidad de un paso a nivel o de un puente móvil (lado izquierdo)',
  'P-10b':  'Aproximación de un paso a nivel o de un puente móvil (lado izquierdo)',
  'P-10c':  'Cercanía de un paso a nivel o de un puente móvil (lado izquierdo)',
  'P-11':   'Situación de un paso a nivel sin barreras',
  'P-11a':  'Situación de un paso a nivel sin barreras de más de una vía férrea',
  'P-12':   'Aeropuerto',
  'P-13a':  'Curva peligrosa hacia la derecha',
  'P-13b':  'Curva peligrosa hacia la izquierda',
  'P-14a':  'Curvas peligrosas hacia la derecha',
  'P-14b':  'Curvas peligrosas hacia la izquierda',
  'P-15':   'Perfil irregular',
  'P-15a':  'Resalto',
  'P-15b':  'Badén',
  'P-16a':  'Bajada con fuerte pendiente',
  'P-16b':  'Subida con fuerte pendiente',
  'P-17':   'Estrechamiento de calzada',
  'P-17a':  'Estrechamiento de calzada por la derecha',
  'P-17b':  'Estrechamiento de calzada por la izquierda',
  'P-18':   'Obras',
  'P-19':   'Pavimento deslizante',
  'P-20a':  'Paso de peatones',
  'P-20b':  'Peatones en calzada',
  'P-21a':  'Niños',
  'P-22b':  'Ciclistas',
  'P-23':   'Paso de animales domésticos',
  'P-24':   'Paso de animales en libertad',
  'P-25':   'Circulación en los dos sentidos',
  'P-26':   'Desprendimiento',
  'P-27':   'Muelle',
  'P-28':   'Proyección de gravilla',
  'P-29':   'Viento transversal',
  'P-30':   'Escalón lateral',
  'P-31':   'Congestión',
  'P-32':   'Obstrucción en la calzada',
  'P-33':   'Visibilidad reducida',
  'P-34':   'Pavimento deslizante por hielo o nieve',
  'P-50':   'Otros peligros',

  // ── S-series: Señales de indicación ──────────────────────────────────────
  'S-1':    'Autopista',
  'S-1a':   'Autovía',
  'S-1b':   'Carretera multicarril',
  'S-1c':   'Carretera 2+1',
  'S-2':    'Fin de autopista',
  'S-2a':   'Fin de autovía',
  'S-2b':   'Fin de carretera multicarril',
  'S-2c':   'Fin de carretera 2+1',
  'S-3':    'Vía reservada para automóviles',
  'S-4':    'Fin de vía reservada para automóviles',
  'S-5':    'Túnel',
  'S-7':    'Velocidad máxima aconsejada',
  'S-8':    'Fin de velocidad máxima aconsejada',
  'S-9':    'Intervalo aconsejado de velocidades',
  'S-10':   'Fin de intervalo aconsejado de velocidades',
  'S-11':   'Calzada de un carril de sentido único',
  'S-11a':  'Calzada de dos carriles de sentido único',
  'S-11b':  'Calzada de tres carriles de sentido único',
  'S-12':   'Tramo de calzada de sentido único',
  'S-13':   'Situación de un paso de peatones',
  'S-14a':  'Paso superior para peatones',
  'S-14b':  'Paso inferior para peatones',
  'S-14c':  'Paso superior para peatones con rampa',
  'S-14d':  'Paso inferior para peatones con rampa',
  'S-14e':  'Paso superior para peatones con raíl o rampa para ciclos',
  'S-14f':  'Paso inferior para peatones con raíl o rampa para ciclos',
  'S-15a':  'Calzada sin salida',
  'S-15b':  'Preseñalización de calzada sin salida',
  'S-15c':  'Preseñalización de calzada sin salida (variante)',
  'S-15d':  'Preseñalización de calzada sin salida (variante)',
  'S-15e':  'Calzada sin salida excepto para peatones o ciclos',
  'S-16':   'Zona de frenado de emergencia',
  'S-17':   'Estacionamiento',
  'S-17a':  'Estacionamiento de necesidad',
  'S-18':   'Lugar reservado para taxis',
  'S-19':   'Parada de autobuses',
  'S-20':   'Parada de tranvías',
  'S-21':   'Puerto de montaña',
  'S-22':   'Cambio de sentido al mismo nivel',
  'S-23':   'Hospital',
  'S-24':   'Fin de obligación de alumbrado de corto alcance',
  'S-25':   'Cambio de sentido a distinto nivel',
  'S-26a':  'Panel de aproximación a salida (300 m)',
  'S-26b':  'Panel de aproximación a salida (200 m)',
  'S-26c':  'Panel de aproximación a salida (100 m)',
  'S-27':   'Auxilio en carretera',
  'S-28':   'Zona de estancia y juego',
  'S-29':   'Fin de zona de estancia y juego',
  'S-30a':  'Zona peatonal',
  'S-31a':  'Fin de zona peatonal',
  'S-32':   'Telepeaje',
  'S-33':   'Senda ciclopeatonal',
  'S-34':   'Apartadero',
  'S-34a':  'Apartadero en túneles con teléfono de emergencia',
  'S-35':   'Vía reservada para ciclos',
  'S-36':   'Fin de vía reservada para ciclos',
  'S-37':   'Vía reservada para vehículos de movilidad personal',
  'S-38':   'Vía reservada para ciclos y vehículos de movilidad personal',
  'S-39':   'Fin de vía reservada para vehículos de movilidad personal',
  'S-40':   'Fin de vía reservada para ciclos y vehículos de movilidad personal',
  'S-41':   'Vía reservada para ciclos y peatones (espacio diferenciado)',
  'S-42':   'Fin de vía reservada para ciclos y peatones (espacio diferenciado)',
  'S-43':   'Vía reservada para ciclos, VMP y peatones',
  'S-44':   'Fin de vía reservada para ciclos, VMP y peatones',
  'S-45':   'Situación de un paso para ciclistas',
  'S-46':   'Situación de un paso para peatones y ciclistas',
  'S-47':   'Zona de coexistencia',
  'S-48':   'Fin de zona de coexistencia',
  'S-49':   'Avanza moto o bici',
  'S-50a':  'Carriles reservados para el tráfico en función de la velocidad señalizada',
  'S-50b':  'Carriles reservados para el tráfico en función de la velocidad señalizada',
  'S-50c':  'Carriles reservados para el tráfico en función de la velocidad señalizada',
  'S-50d':  'Carriles reservados para el tráfico en función de la velocidad señalizada',
  'S-50e':  'Carriles reservados para el tráfico en función de la velocidad señalizada',
  'S-51a':  'Carril reservado para tipos específicos de vehículos',
  'S-51b':  'Carril reservado para vehículos con alta ocupación (VAO)',
  'S-52':   'Final de carril destinado a la circulación',
  'S-53':   'Paso de uno a dos carriles de circulación',
  'S-53b':  'Paso de dos a tres carriles de circulación',
  'S-60a':  'Bifurcación hacia la izquierda en calzada de dos carriles',
  'S-60b':  'Bifurcación hacia la derecha en calzada de dos carriles',
  'S-61a':  'Bifurcación hacia la izquierda en calzada de tres carriles',
  'S-61b':  'Bifurcación hacia la derecha en calzada de tres carriles',
  'S-62a':  'Bifurcación hacia la izquierda en calzada de cuatro carriles',
  'S-62b':  'Bifurcación hacia la derecha en calzada de cuatro carriles',
  'S-66':   'Carril bici en sentido opuesto',
  'S-100':  'Puesto de socorro',
  'S-101':  'Base de ambulancia',
  'S-102':  'Servicio de inspección técnica de vehículos',
  'S-103':  'Taller de reparación',
  'S-104':  'Teléfono',
  'S-105':  'Surtidor de carburante',
  'S-105b': 'Surtidor de carburante y GLP',
  'S-105c': 'Surtidor de GLP',
  'S-105d': 'Surtidor de carburante y estación de recarga eléctrica',
  'S-105e': 'Estación de recarga eléctrica',
  'S-105f': 'Surtidor de carburante, GLP y estación de recarga eléctrica',
  'S-106':  'Taller de reparación y surtidor de carburante',
  'S-107':  'Campamento',
  'S-108':  'Agua',
  'S-109':  'Lugar pintoresco',
  'S-110':  'Hotel o motel',
  'S-111':  'Restauración',
  'S-112':  'Cafetería',
  'S-113':  'Terreno para remolques-vivienda',
  'S-114':  'Merendero',
  'S-115':  'Punto de partida para excursiones a pie',
  'S-116':  'Campamento y terreno para remolques-vivienda',
  'S-117':  'Albergue de juventud',
  'S-118':  'Información turística',
  'S-119':  'Coto de pesca',
  'S-120':  'Parque o espacio natural',
  'S-121':  'Monumento',
  'S-122':  'Otros servicios',
  'S-123':  'Área de descanso',
  'S-124':  'Estacionamiento para usuarios del ferrocarril',
  'S-125':  'Estacionamiento para usuarios del ferrocarril inferior',
  'S-126':  'Estacionamiento para usuarios del autobús',
  'S-128':  'Punto de vaciado de caravanas y autocaravanas',
  'S-129':  'Estacionamiento de emergencia por nevadas',
  'S-200':  'Preseñalización de glorieta',
  'S-201':  'Preseñalización de glorieta partida desde la calzada principal',
  'S-202':  'Preseñalización de glorieta partida desde la calzada secundaria',
  'S-203':  'Preseñalización de glorieta con selección de carriles',

  // ── TP-series: Señales de obras (peligro) ────────────────────────────────
  'TP-1':   'Intersección con prioridad',
  'TP-1a':  'Con prioridad sobre vía a la derecha',
  'TP-1b':  'Con prioridad sobre vía a la izquierda',
  'TP-1c':  'Con prioridad sobre incorporación por la derecha',
  'TP-1d':  'Con prioridad sobre incorporación por la izquierda',
  'TP-2':   'Intersección con prioridad de la derecha',
  'TP-3':   'Semáforos',
  'TP-4':   'Intersección con circulación giratoria',
  'TP-13a': 'Curva peligrosa hacia la derecha',
  'TP-13b': 'Curva peligrosa hacia la izquierda',
  'TP-14a': 'Curvas peligrosas hacia la derecha',
  'TP-14b': 'Curvas peligrosas hacia la izquierda',
  'TP-15':  'Perfil irregular',
  'TP-15a': 'Resalto',
  'TP-15b': 'Badén',
  'TP-17':  'Estrechamiento de calzada',
  'TP-17a': 'Estrechamiento de calzada por la derecha',
  'TP-17b': 'Estrechamiento de calzada por la izquierda',
  'TP-18':  'Obras',
  'TP-19':  'Pavimento deslizante',
  'TP-25':  'Circulación en los dos sentidos',
  'TP-26':  'Desprendimiento',
  'TP-28':  'Proyección de gravilla',
  'TP-30':  'Escalón lateral',
  'TP-31':  'Congestión',
  'TP-50':  'Otros peligros',

  // ── TR-series: Señales de obras (reglamentación) ─────────────────────────
  'TR-1':       'Ceda el paso',
  'TR-5':       'Prioridad al sentido contrario',
  'TR-6':       'Prioridad respecto al sentido contrario',
  'TR-101':     'Prohibido el paso',
  'TR-106':     'Entrada prohibida a vehículos de transporte de mercancías',
  'TR-201':     'Limitación de peso',
  'TR-204':     'Limitación de ancho',
  'TR-205':     'Limitación de altura',
  'TR-301-20':  'Velocidad máxima a 20 km/h',
  'TR-301-30':  'Velocidad máxima a 30 km/h',
  'TR-301-40':  'Velocidad máxima a 40 km/h',
  'TR-301-50':  'Velocidad máxima a 50 km/h',
  'TR-301-60':  'Velocidad máxima a 60 km/h',
  'TR-301-70':  'Velocidad máxima a 70 km/h',
  'TR-301-80':  'Velocidad máxima a 80 km/h',
  'TR-301-90':  'Velocidad máxima a 90 km/h',
  'TR-301-100': 'Velocidad máxima a 100 km/h',
  'TR-302':     'Giro a la derecha prohibido',
  'TR-303':     'Giro a la izquierda prohibido',
  'TR-305':     'Adelantamiento prohibido',
  'TR-306':     'Adelantamiento prohibido a camiones',
  'TR-308':     'Estacionamiento prohibido',
  'TR-400a':    'Sentido obligatorio',
  'TR-400b':    'Sentido obligatorio',
  'TR-401a':    'Sentido obligatorio',
  'TR-401b':    'Sentido obligatorio',
  'TR-500':     'Fin de prohibiciones',

  // ── TB-series: Balizas de obras ──────────────────────────────────────────
  'TB-1':  'Panel direccional ancho',
  'TB-2':  'Panel direccional estrecho',
  'TB-3':  'Panel doble direccional ancho',
  'TB-4':  'Panel doble direccional estrecho',
  'TB-5':  'Panel de zona excluida al tráfico',
  'TB-6':  'Cono de tráfico',
  'TB-7':  'Piquete',
  'TB-8':  'Baliza de borde derecho',
  'TB-9':  'Baliza de borde izquierdo',
  'TB-10': 'Captafaro',
  'TB-11': 'Baliza luminosa y reflectante',
  'TB-12': 'Marca vial provisional',
  'TB-13': 'Guirnalda',
  'TB-14': 'Bastidor móvil',

  // ── TS-series: Señales de obras (indicación) ─────────────────────────────
  'TS-52':  'Convergencia de un carril por la derecha (de 3 a 2)',
  'TS-53':  'Convergencia de un carril por la izquierda (de 3 a 2)',
  'TS-54':  'Convergencia de un carril por la derecha (de 2 a 1)',
  'TS-55':  'Convergencia de un carril por la izquierda (de 2 a 1)',
  'TS-60':  'Desvío de un carril por la calzada opuesta',
  'TS-61':  'Desvío de un carril por la calzada opuesta (manteniendo otro)',
  'TS-62':  'Desvío de dos carriles por la calzada opuesta',
  'TS-210': 'Croquis de desvío en obra',
  'TS-220': 'Preseñalización de direcciones',
  'TS-800': 'Distancia al comienzo del peligro o prescripción',
  'TS-810': 'Longitud de tramo peligroso o sujeto a prescripción',
};

// Знаки, убранные из каталога DGT в обновлении 2026 года
const OBSOLETE_2026 = [
  // Parking par/impar (removed — replaced with R-308c/d/f/g/h)
  'R-308a', 'R-308b',
  // Any known removed codes from the 2026 update press release
  // (DGT removed 16 signs — full list pending official gazette)
];

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Загружаю текущие знаки из БД...\n');

  const { data: dbSigns, error } = await supabase
    .from('road_signs')
    .select('sign_number, name_es, name_ru, description_es, description_ru, image_url')
    .order('sign_number');

  if (error) {
    console.error('❌ Ошибка запроса БД:', error.message);
    process.exit(1);
  }

  // Build lookup maps
  const dbMap = new Map();
  for (const s of dbSigns) {
    if (!s.sign_number) continue;
    dbMap.set(s.sign_number.trim().toUpperCase(), s);
  }

  const canonicalKeys = Object.keys(CANONICAL).map(k => k.toUpperCase());
  const dbKeys = [...dbMap.keys()];

  // 1. Missing from DB
  const missing = canonicalKeys.filter(k => !dbMap.has(k));

  // 2. In DB but not in canonical (extra / potentially non-standard)
  const extra = dbKeys.filter(k => !canonicalKeys.includes(k));

  // 3. Quality issues in existing signs
  const qualityIssues = [];
  for (const [code, sign] of dbMap) {
    const issues = [];
    if (!sign.image_url || sign.image_url.trim() === '') issues.push('нет image_url');
    if (!sign.name_es || sign.name_es.trim() === '')     issues.push('нет name_es');
    if (!sign.name_ru || sign.name_ru.trim() === '')     issues.push('нет name_ru');
    if (!sign.description_es || sign.description_es.trim() === '') issues.push('нет description_es');
    if (!sign.description_ru || sign.description_ru.trim() === '') issues.push('нет description_ru');
    if (issues.length > 0) qualityIssues.push({ code, issues });
  }

  // 4. By series
  const series = ['R', 'P', 'S', 'TP', 'TR', 'TB', 'TS'];
  const bySeriesStats = series.map(prefix => {
    const canonCount = canonicalKeys.filter(k => k.startsWith(prefix + '-') || k.startsWith(prefix + '-')).length;
    const dbCount = dbKeys.filter(k => {
      const p = k.replace(/-.*/, '');
      return p === prefix;
    }).length;
    const missingInSeries = missing.filter(k => k.startsWith(prefix + '-') || k.replace(/-.*/, '') === prefix);
    return { prefix, canonCount, dbCount, missing: missingInSeries.length };
  });

  // ── Print report ──────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('  АУДИТ БАЗЫ ЗНАКОВ DGT — Skily');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`📦 В БД сейчас:          ${dbSigns.length} знаков`);
  console.log(`📋 В официальном каталоге: ${canonicalKeys.length} знаков`);
  console.log(`❌ Отсутствуют в БД:      ${missing.length}`);
  console.log(`⚠️  Не в каталоге (extra): ${extra.length}`);
  console.log(`🔧 Проблемы с качеством:  ${qualityIssues.length}\n`);

  console.log('По сериям:');
  console.log('  Серия  | Каталог | В БД | Нет');
  console.log('  -------|---------|------|----');
  for (const s of bySeriesStats) {
    console.log(`  ${s.prefix.padEnd(6)} | ${String(s.canonCount).padEnd(7)} | ${String(s.dbCount).padEnd(4)} | ${s.missing}`);
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log(`❌ ОТСУТСТВУЮЩИЕ ЗНАКИ (${missing.length}):`);
  const missingByGroup = {};
  for (const code of missing) {
    const prefix = code.replace(/-.*/, '');
    if (!missingByGroup[prefix]) missingByGroup[prefix] = [];
    missingByGroup[prefix].push(code);
  }
  for (const [prefix, codes] of Object.entries(missingByGroup)) {
    console.log(`\n  ${prefix}-серия:`);
    for (const code of codes) {
      const originalKey = Object.keys(CANONICAL).find(k => k.toUpperCase() === code);
      console.log(`    ${code.padEnd(12)} ${CANONICAL[originalKey] || ''}`);
    }
  }

  if (extra.length > 0) {
    console.log('\n─────────────────────────────────────────────────────────');
    console.log(`⚠️  В БД, но НЕТ в официальном каталоге (${extra.length}):`);
    for (const code of extra.sort()) {
      const sign = dbMap.get(code);
      console.log(`    ${code.padEnd(14)} ${sign?.name_es || '—'}`);
    }
  }

  const noNameRu = qualityIssues.filter(q => q.issues.includes('нет name_ru'));
  const noDescRu = qualityIssues.filter(q => q.issues.includes('нет description_ru'));
  const noImg    = qualityIssues.filter(q => q.issues.includes('нет image_url'));

  if (qualityIssues.length > 0) {
    console.log('\n─────────────────────────────────────────────────────────');
    console.log(`🔧 ПРОБЛЕМЫ С КАЧЕСТВОМ:`);
    if (noImg.length)    console.log(`  • Нет image_url:        ${noImg.length} знаков`);
    if (noNameRu.length) console.log(`  • Нет name_ru:          ${noNameRu.length} знаков`);
    if (noDescRu.length) console.log(`  • Нет description_ru:   ${noDescRu.length} знаков`);
  }

  // ── Write markdown report ─────────────────────────────────────────────────
  const now = new Date().toISOString().slice(0, 10);
  let md = `# Аудит базы знаков DGT — ${now}\n\n`;
  md += `> Источник: Wikipedia Anexo (R/P/S/T) + Manual DGT 2025/2026  \n`;
  md += `> Всё read-only — ничего не изменено в БД.\n\n`;
  md += `## Сводка\n\n`;
  md += `| | |\n|---|---|\n`;
  md += `| В БД | ${dbSigns.length} |\n`;
  md += `| Официальный каталог | ${canonicalKeys.length} |\n`;
  md += `| Отсутствуют в БД | **${missing.length}** |\n`;
  md += `| Не в каталоге (extra) | ${extra.length} |\n`;
  md += `| С проблемами качества | ${qualityIssues.length} |\n\n`;

  md += `## По сериям\n\n`;
  md += `| Серия | Каталог | В БД | Нет |\n|---|---|---|---|\n`;
  for (const s of bySeriesStats) {
    md += `| ${s.prefix} | ${s.canonCount} | ${s.dbCount} | **${s.missing}** |\n`;
  }

  md += `\n## Отсутствующие знаки (${missing.length})\n\n`;
  for (const [prefix, codes] of Object.entries(missingByGroup)) {
    md += `### ${prefix}-серия\n\n`;
    md += `| Код | Название (ES) |\n|---|---|\n`;
    for (const code of codes) {
      const originalKey = Object.keys(CANONICAL).find(k => k.toUpperCase() === code);
      md += `| \`${code}\` | ${CANONICAL[originalKey] || '—'} |\n`;
    }
    md += '\n';
  }

  if (extra.length > 0) {
    md += `## В БД, но нет в каталоге (${extra.length})\n\n`;
    md += `| Код | name_es |\n|---|---|\n`;
    for (const code of extra.sort()) {
      const sign = dbMap.get(code);
      md += `| \`${code}\` | ${sign?.name_es || '—'} |\n`;
    }
    md += '\n';
  }

  if (qualityIssues.length > 0) {
    md += `## Проблемы с качеством\n\n`;
    md += `| Код | Проблемы |\n|---|---|\n`;
    for (const { code, issues } of qualityIssues) {
      md += `| \`${code}\` | ${issues.join(', ')} |\n`;
    }
    md += '\n';
  }

  md += `## Рекомендуемые следующие шаги\n\n`;
  md += `1. Скачать SVG для missing-кодов с Wikimedia Commons\n`;
  md += `   - Pattern: \`https://commons.wikimedia.org/wiki/Special:FilePath/Spain_traffic_signal_{код_lowercase}.svg\`\n`;
  md += `2. Для кодов "не в каталоге" — проверить каждый вручную. Возможно это легитимные варианты или устаревшие.\n`;
  md += `3. Перевести name_ru + description_ru для знаков у которых они пустые.\n`;
  md += `4. Добавить \`ALTER TABLE road_signs ADD COLUMN deprecated_at timestamptz;\` перед пометкой устаревших.\n`;

  writeFileSync('audit-report.md', md, 'utf-8');
  console.log('\n✅ Подробный отчёт сохранён → audit-report.md');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(e => { console.error(e); process.exit(1); });
